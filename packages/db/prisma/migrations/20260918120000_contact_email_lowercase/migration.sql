-- Make "contact emails are lowercase" a database-level invariant, and index the
-- contact list/search queries that depend on it.
--
-- Background: every application write path already normalizes via
-- ContactService.normalizeEmail, and 20260615120000_normalize_contact_emails
-- repaired the existing rows. What was missing was enforcement -- nothing stopped a
-- future code path, a raw UPDATE, or a self-hosted operator's psql session from
-- reintroducing mixed case. Search had to stay on ILIKE to defend against that
-- possibility, which costs roughly 3x on the unindexable cases and blocks the plain
-- btree from ever serving an exact or prefix match.
--
-- With the invariant enforced here, the application can drop `mode: 'insensitive'`
-- and lowercase the needle instead.

-- 1. Repair any rows that drifted since the 20260615 backfill.
--
--    Lowercasing a row whose normalized form already exists in the same project would
--    violate contacts_projectId_email_key. 20260615 merged those duplicates properly
--    (reassigning emails, events, workflow executions and segment memberships); doing
--    a second merge here silently would destroy contact history at migration time, so
--    instead this fails loudly and leaves the data for an operator to resolve
--    deliberately. On a database that has run 20260615 and writes only through the
--    API, both statements are no-ops.
UPDATE contacts c
SET email = lower(btrim(c.email))
WHERE c.email <> lower(btrim(c.email))
  AND NOT EXISTS (
    SELECT 1 FROM contacts o
    WHERE o."projectId" = c."projectId"
      AND o.email = lower(btrim(c.email))
      AND o.id <> c.id
  );

DO $$
DECLARE
  stragglers bigint;
BEGIN
  SELECT count(*) INTO stragglers FROM contacts WHERE email <> lower(btrim(email));
  IF stragglers > 0 THEN
    RAISE EXCEPTION
      'contact_email_lowercase: % contact(s) cannot be lowercased without colliding with an existing contact in the same project. Merge these duplicates (see 20260615120000_normalize_contact_emails for the merge strategy) and re-run.', stragglers;
  END IF;
END $$;

-- 2. Enforce the invariant on every future write.
--
--    The WHEN clause is evaluated in C, so already-normalized input -- which is
--    effectively all of it, since the API normalizes first -- never enters PL/pgSQL.
--    `UPDATE OF email` further keeps the trigger out of the way of the far more
--    frequent subscribed/snoozedUntil writes from the bounce, complaint and snooze
--    paths, which do not touch email at all.
CREATE OR REPLACE FUNCTION contacts_normalize_email() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_normalize_email ON contacts;
CREATE TRIGGER contacts_normalize_email
  BEFORE INSERT OR UPDATE OF email ON contacts
  FOR EACH ROW
  WHEN (NEW.email IS DISTINCT FROM lower(btrim(NEW.email)))
  EXECUTE FUNCTION contacts_normalize_email();

-- 3. Indexes for the list and search queries.
--
--    IF NOT EXISTS is deliberate. Prisma runs a migration inside one transaction and
--    CREATE INDEX CONCURRENTLY cannot run there. A plain CREATE INDEX takes SHARE, and
--    the CREATE TRIGGER above takes SHARE ROW EXCLUSIVE; both are held until the
--    transaction commits. Reads are unaffected (neither conflicts with ACCESS SHARE),
--    but every INSERT/UPDATE/DELETE on contacts blocks for the whole migration. On a
--    multi-million-row table that is long enough to stall contact ingestion and, if
--    nothing times out, to exhaust the connection pool.
--
--    For production, build both indexes with CONCURRENTLY *before* deploying (see the
--    README.md next to this migration) and these statements become no-ops. Development
--    and fresh self-hosted installs get them created here, where the table is small and
--    the lock is irrelevant. Correctness does not depend on either path: the migration
--    is transactional, so a timeout mid-build rolls the whole thing back cleanly.

--    Serves `ORDER BY "createdAt" DESC, id DESC LIMIT n` -- both the unfiltered list
--    and any search term common enough that 21 matches turn up early in the walk.
CREATE INDEX IF NOT EXISTS "contacts_projectId_createdAt_id_idx"
  ON contacts ("projectId", "createdAt" DESC, id DESC);

--    Serves LIKE '%term%' for terms selective enough to be worth a bitmap. The planner
--    BitmapAnds it against contacts_projectId_idx for the tenant filter.
--
--    A composite (projectId, email) GIN via btree_gin measured ~10-20% better, but
--    text_ops is the default GIN opclass for text, so Postgres omits it from the catalog
--    while Prisma requires it spelled out -- leaving the schema permanently drifted and
--    every `migrate dev` emitting a spurious DROP/CREATE. Not worth it for that margin.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "contacts_email_trgm_idx"
  ON contacts USING GIN (email gin_trgm_ops);

-- 4. Default statistics leave LIKE selectivity estimates wild enough that the planner
--    skips the trigram index for some terms and not others at identical true
--    selectivity (measured: estimates of 199 vs 80,534 rows for two terms both
--    matching ~40k). A higher target makes the choice consistent.
ALTER TABLE contacts ALTER COLUMN email SET STATISTICS 1000;
ANALYZE contacts;
