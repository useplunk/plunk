#!/usr/bin/env bash
#
# Contact search benchmark. Measures the contact list + search queries against a
# synthetic corpus, before and after the lowercase-email change.
#
#   yarn workspace @plunk/db bench:contact-search
#
# Not wired into `yarn test` or CI -- it seeds millions of rows and takes minutes.
# Run it by hand when touching contact search, indexing, or the email invariant.
#
# Environment:
#   BENCH_CONTACTS   rows in the measured tenant (default 2000000)
#   BENCH_PORT       host port for the throwaway postgres (default 55433)
#   BENCH_CONTAINER  container name (default plunk-bench-contact-search)
#   BENCH_KEEP       set to 1 to leave the container up for manual EXPLAIN work
#   BENCH_RUNS       timed repetitions per query, median reported (default 5)
#
set -euo pipefail

CONTACTS="${BENCH_CONTACTS:-2000000}"
PORT="${BENCH_PORT:-55433}"
CONTAINER="${BENCH_CONTAINER:-plunk-bench-contact-search}"
RUNS="${BENCH_RUNS:-5}"
PROJECT="bench_main"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PKG="$(cd "$HERE/../.." && pwd)"

# Search terms spanning the selectivity range. A trigram index only helps below roughly
# 5% selectivity and cannot help at all under 3 characters, so a benchmark that only
# tested rare terms would report a win production never sees.
TERMS=(gmail.com ez nguyen martinez elena.pons zzqx)

cleanup() {
  if [[ "${BENCH_KEEP:-0}" == "1" ]]; then
    echo ""
    echo "BENCH_KEEP=1 -- container '$CONTAINER' left running on port $PORT"
    echo "  psql postgresql://postgres:bench@localhost:$PORT/bench"
  else
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

psqlq() { docker exec -i "$CONTAINER" psql -U postgres -d bench -v ON_ERROR_STOP=1 -qAt "$@"; }

median() { sort -n | awk '{a[NR]=$1} END {print (NR%2) ? a[(NR+1)/2] : (a[NR/2]+a[NR/2+1])/2}'; }

# Median EXPLAIN ANALYZE execution time in ms. Uses the server-reported figure so
# client and network overhead stay out of the comparison.
timed() {
  local sql="$1" i
  psqlq -c "EXPLAIN (ANALYZE) $sql" >/dev/null 2>&1   # warm the cache
  for ((i = 0; i < RUNS; i++)); do
    psqlq -c "EXPLAIN (ANALYZE) $sql" | awk '/Execution Time/ {print $3}'
  done | median
}

# --- query shapes -------------------------------------------------------------
# Mirrors what Prisma emits for ContactService.list(): `take: limit + 1` becomes
# LIMIT 21 and `skip` becomes the OFFSET even at zero. $1 is ILIKE before the change
# (mode: 'insensitive') and LIKE after.

page_sql() {
  echo "SELECT id, email, data, subscribed, \"projectId\", \"createdAt\", \"updatedAt\"
        FROM contacts WHERE \"projectId\" = '$PROJECT' AND email $1 '%$2%'
        ORDER BY \"createdAt\" DESC, id DESC LIMIT 21 OFFSET 0;"
}

count_sql() {
  echo "SELECT COUNT(*) FROM (SELECT id FROM contacts
        WHERE \"projectId\" = '$PROJECT' AND email $1 '%$2%' OFFSET 0) sub;"
}

list_sql() {
  echo "SELECT id, email, data, subscribed, \"projectId\", \"createdAt\", \"updatedAt\"
        FROM contacts WHERE \"projectId\" = '$PROJECT'
        ORDER BY \"createdAt\" DESC, id DESC LIMIT 21 OFFSET 0;"
}

# Insert throughput in rows/sec, median of 3 timed batches after one discarded warm-up.
#
# Measured this way because a single batch is not reproducible: the first insert of a
# phase pays one-off page-allocation and checkpoint costs, and each batch leaves dead
# tuples behind that change the next one's cost. Earlier single-batch runs varied
# 27k-40k rows/sec for the *same* configuration, which is wider than the effect being
# measured. Each batch is followed by a DELETE and a VACUUM so every repetition starts
# from the same table shape.
#
# Two input shapes, pricing different things:
#   lowercase  -- what production writes (the API normalizes first), so the trigger's
#                 WHEN clause is evaluated in C and returns false without entering
#                 PL/pgSQL. Isolates the new indexes' write cost.
#   mixedcase  -- worst case, the trigger body runs for every row.
# In the AFTER phase this also carries GIN trigram index maintenance, so the delta is
# not attributable to the trigger alone.
insert_batch() { # $1 = lowercase|mixedcase -> prints rows/sec for one batch
  local start end rows=50000 domain
  [[ "$1" == "mixedcase" ]] && domain='@Example.COM' || domain='@example.com'
  start=$(date +%s.%N)
  psqlq -c "INSERT INTO contacts (id, email, data, subscribed, \"projectId\", \"createdAt\", \"updatedAt\")
            SELECT gen_random_uuid()::text,
                   'throughput_' || g || '_' || floor(random()*999999)::text || '$domain',
                   NULL, true, 'bench_other', now(), now()
            FROM generate_series(1, $rows) g
            ON CONFLICT (\"projectId\", email) DO NOTHING;" >/dev/null
  end=$(date +%s.%N)
  awk -v s="$start" -v e="$end" -v r="$rows" 'BEGIN { printf "%.0f", r/(e-s) }'
  # Restore the corpus so the next repetition, and the other phase, see the same table.
  psqlq -c "DELETE FROM contacts WHERE email LIKE 'throughput\\_%';" >/dev/null
  psqlq -c "VACUUM contacts;" >/dev/null
}

insert_throughput() { # $1 = lowercase|mixedcase
  insert_batch "$1" >/dev/null          # warm-up, discarded
  local i
  for ((i = 0; i < 3; i++)); do insert_batch "$1"; echo; done | median
}

# --- phases -------------------------------------------------------------------

# BEFORE: strip everything this branch adds, and query with ILIKE as the old code did.
phase_before() {
  psqlq -c "DROP INDEX IF EXISTS \"contacts_projectId_createdAt_id_idx\";
            DROP INDEX IF EXISTS \"contacts_email_trgm_idx\";
            DROP TRIGGER IF EXISTS contacts_normalize_email ON contacts;
            ALTER TABLE contacts ALTER COLUMN email SET STATISTICS -1;
            ANALYZE contacts;" >/dev/null
}

# Replay the real migration file rather than a hand-maintained copy, so the benchmark
# cannot drift from what actually ships.
replay_migration() {
  docker exec -i "$CONTAINER" psql -U postgres -d bench -v ON_ERROR_STOP=1 -q \
    -c "SET client_min_messages = warning;" \
    -f - < "$DB_PKG/prisma/migrations/$MIGRATION_DIR/migration.sql" >/dev/null 2>&1
  psqlq -c "ANALYZE contacts;" >/dev/null
}

# AFTER: everything the migration adds.
#
# To attribute the two indexes separately, drop one after this phase and re-measure:
#   DROP INDEX "contacts_email_trgm_idx";              -- leaves the createdAt btree
#   DROP INDEX "contacts_projectId_createdAt_id_idx";  -- leaves the trigram index
# Run with BENCH_KEEP=1 to keep the container around for that. The README records what
# that attribution showed and why both indexes ship.
phase_after() {
  replay_migration
}

measure() { # $1=op  -> emits "term page count" lines
  local op="$1" t
  for t in "${TERMS[@]}"; do
    echo "$t $(timed "$(page_sql "$op" "$t")") $(timed "$(count_sql "$op" "$t")")"
  done
}

# --- run ----------------------------------------------------------------------

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }

# The migration this branch adds; replay_migration applies it verbatim so the benchmark
# measures the real migration rather than a hand-maintained copy that can drift.
MIGRATION_DIR="$(ls "$DB_PKG/prisma/migrations" | grep -- '_contact_email_lowercase$' | tail -1)"
[[ -n "$MIGRATION_DIR" ]] || { echo "could not find the *_contact_email_lowercase migration" >&2; exit 1; }

echo "==> starting postgres ($CONTAINER, port $PORT)"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=bench -e POSTGRES_DB=bench -e LANG=en_US.utf8 \
  -p "$PORT:5432" --shm-size=1g postgres:16 \
  -c shared_buffers=2GB -c work_mem=64MB -c maintenance_work_mem=1GB \
  -c effective_cache_size=6GB -c random_page_cost=1.1 >/dev/null

for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

echo "==> applying migrations"
DATABASE_URL="postgresql://postgres:bench@localhost:$PORT/bench" \
DIRECT_DATABASE_URL="postgresql://postgres:bench@localhost:$PORT/bench" \
  yarn --cwd "$DB_PKG" prisma migrate deploy >/dev/null

echo "==> seeding ~$CONTACTS contacts (minutes, not seconds)"
docker exec -i "$CONTAINER" psql -U postgres -d bench -q \
  -v contacts="$CONTACTS" -v project="$PROJECT" -f - < "$HERE/seed.sql" >/dev/null

ACTUAL=$(psqlq -c "SELECT count(*) FROM contacts WHERE \"projectId\" = '$PROJECT';")
TOTAL=$(psqlq -c "SELECT count(*) FROM contacts;")
echo "    $ACTUAL contacts in '$PROJECT' ($TOTAL total)"

echo "==> measuring BEFORE (ILIKE, no new indexes, no trigger)"
phase_before
mapfile -t BEFORE < <(measure ILIKE)
BEFORE_LIST=$(timed "$(list_sql)")
BEFORE_INS=$(insert_throughput lowercase)

echo "==> measuring AFTER (LIKE, trigram + createdAt indexes, trigger)"
phase_after
mapfile -t AFTER < <(measure LIKE)
AFTER_LIST=$(timed "$(list_sql)")
AFTER_INS=$(insert_throughput lowercase)
AFTER_INS_MIXED=$(insert_throughput mixedcase)

# --- report -------------------------------------------------------------------
echo ""
echo "contacts in tenant: $ACTUAL   runs per query: $RUNS   (median EXPLAIN ANALYZE ms)"
echo ""
echo "  before = stock: ILIKE, no new indexes, no trigger"
echo "  after  = everything the migration adds, queried with LIKE"
echo ""
printf '%-14s %22s %22s\n' '' '--------- page1 ---------' '--------- count ---------'
printf '%-14s %10s %10s %10s %10s\n' 'term' 'before' 'after' 'before' 'after'
printf '%s\n' '---------------------------------------------------------------------'
for i in "${!TERMS[@]}"; do
  read -r _ bp bc <<<"${BEFORE[$i]}"
  read -r _ ap ac <<<"${AFTER[$i]}"
  printf '%-14s %10s %10s %10s %10s\n' "${TERMS[$i]}" "$bp" "$ap" "$bc" "$ac"
done
printf '%s\n' '---------------------------------------------------------------------'
printf '%-14s %10s %10s\n' '(no search)' "$BEFORE_LIST" "$AFTER_LIST"
echo ""
echo "insert throughput (50k rows, median of 3, rows/sec):"
printf '  %-46s %10s\n' 'before' "$BEFORE_INS"
printf '  %-46s %10s\n' 'after, pre-normalized input (production shape)' "$AFTER_INS"
printf '  %-46s %10s\n' 'after, mixed-case input (trigger body runs)' "$AFTER_INS_MIXED"
