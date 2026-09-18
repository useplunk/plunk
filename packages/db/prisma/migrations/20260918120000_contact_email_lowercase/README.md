# Deploying `20260918120000_contact_email_lowercase`

The two `CREATE INDEX IF NOT EXISTS` statements in this migration are safe on a small
database and **not** safe on a large one. Prisma runs a migration inside a single
transaction, and `CREATE INDEX CONCURRENTLY` cannot run in a transaction — so the plain
`CREATE INDEX` here takes `ACCESS EXCLUSIVE` on `contacts` for the whole build, blocking
every read and write on the table. On a multi-million-row `contacts` that is an outage.

`IF NOT EXISTS` exists so you can avoid that: build both indexes concurrently *before*
deploying, and the migration's statements become no-ops.

## Production order of operations

1. Against the primary, over the **direct** connection (not PgBouncer in transaction
   mode — `CONCURRENTLY` cannot run through it):

   ```sql
   SET maintenance_work_mem = '2GB';

   CREATE EXTENSION IF NOT EXISTS pg_trgm;

   CREATE INDEX CONCURRENTLY IF NOT EXISTS "contacts_projectId_createdAt_id_idx"
     ON contacts ("projectId", "createdAt" DESC, id DESC);

   CREATE INDEX CONCURRENTLY IF NOT EXISTS "contacts_email_trgm_idx"
     ON contacts USING GIN (email gin_trgm_ops);
   ```

2. Verify neither landed invalid. `CONCURRENTLY` can fail partway and leave an index
   that costs writes and serves no reads:

   ```sql
   SELECT c.relname, i.indisvalid
   FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
   WHERE c.relname IN ('contacts_projectId_createdAt_id_idx',
                       'contacts_email_trgm_idx');
   ```

   Any `indisvalid = false` → `DROP INDEX CONCURRENTLY` and rebuild before continuing.

3. Deploy normally. `migrate deploy` runs this migration; the index statements no-op, and
   the trigger, backfill check and statistics target apply in milliseconds.

## If step 1 raises on the backfill

The `DO $$ ... RAISE EXCEPTION` block fires when a contact cannot be lowercased without
colliding with an existing contact in the same project. That means case-variant duplicates
appeared after `20260615120000_normalize_contact_emails` merged them.

This migration deliberately does not merge them a second time: the correct merge has to
reassign emails, events, workflow executions and segment memberships and reconcile
`subscribed`, and doing that implicitly at deploy time would destroy contact history with
no review. Resolve the duplicates using the strategy documented at the top of
`20260615120000_normalize_contact_emails/migration.sql`, then re-run.

To see them:

```sql
SELECT "projectId", lower(btrim(email)) AS normalized, count(*), array_agg(id)
FROM contacts
GROUP BY 1, 2
HAVING count(*) > 1;
```

## Rollback

The indexes and trigger can be dropped independently and in any order:

```sql
DROP TRIGGER IF EXISTS contacts_normalize_email ON contacts;
DROP FUNCTION IF EXISTS contacts_normalize_email();
DROP INDEX CONCURRENTLY IF EXISTS "contacts_email_trgm_idx";
DROP INDEX CONCURRENTLY IF EXISTS "contacts_projectId_createdAt_id_idx";
ALTER TABLE contacts ALTER COLUMN email SET STATISTICS -1;
```

The lowercase backfill is not reversible, and does not need to be — every write path
already normalized before this migration existed.

**Roll the application back first.** Contact search sends a lowercased needle to a plain
`LIKE`, which is only correct while the stored column is lowercase. Dropping the trigger
while the new application code is live would let mixed-case addresses in through any
future non-normalizing path, and those rows would then be invisible to search.
