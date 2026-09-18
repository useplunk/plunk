# Contact search benchmark

Measures the contact list and contact search queries against a synthetic corpus, before
and after the changes in `20260918120000_contact_email_lowercase`.

```bash
yarn workspace @plunk/db bench:contact-search
```

Requires Docker. It starts a throwaway Postgres on port 55433, applies the real Prisma
migrations, seeds ~2M contacts, measures, and tears the container down. Takes several
minutes and is deliberately **not** wired into `yarn test` or CI — run it by hand when
touching contact search, indexing, or the email invariant.

| Variable | Default | |
|---|---|---|
| `BENCH_CONTACTS` | `2000000` | rows in the measured tenant |
| `BENCH_PORT` | `55433` | host port for the throwaway Postgres |
| `BENCH_CONTAINER` | `plunk-bench-contact-search` | container name |
| `BENCH_RUNS` | `5` | timed repetitions per query; the median is reported |
| `BENCH_KEEP` | unset | set to `1` to leave the container up for manual `EXPLAIN` |

A quick sanity run: `BENCH_CONTACTS=50000 BENCH_RUNS=2 yarn workspace @plunk/db bench:contact-search`.

## What it measures

Three query shapes, reproduced exactly as Prisma emits them for `ContactService.list()`
(`take: limit + 1` → `LIMIT 21`, `skip` → `OFFSET` even at zero):

- **page1** — the `findMany` for the first page of results
- **count** — the `total` that `list()` computes on the first page only
- **(no search)** — the unfiltered list, i.e. the page every user lands on

Against six search terms spanning the selectivity range, because the answer depends
entirely on selectivity. A benchmark that only tested rare terms would report a win
production never sees.

Two configurations:

- **before** — drops everything the migration adds and queries with `ILIKE`, as the old
  code did.
- **after** — replays the migration file verbatim (not a copy, so the benchmark cannot
  drift from what ships) and queries with `LIKE`.

## Results at 2M contacts

Postgres 16.15, `en_US.utf8`, `shared_buffers=2GB`, warm cache, median of 5.
Median `EXPLAIN ANALYZE` execution time in ms.

**page1** (the `findMany`) and **count** (the first-page total), before → after:

| term | matches | page1 before | page1 after | count before | count after |
|---|---|---|---|---|---|
| `gmail.com` | 45% | 416 | **0.37** | 856 | **298** |
| `ez` (2 chars) | 16% | 385 | **0.99** | 747 | **261** |
| `nguyen` | 2% | 345 | **3.2** | 320 | **71** |
| `martinez` | 2% | 361 | **4.1** | 345 | **76** |
| `elena.pons` | 0.01% | 352 | **10.2** | 355 | **14** |
| `zzqx` | 0 | 340 | **0.12** | 348 | **0.11** |
| _(no search)_ | — | 199 | **0.23** | | |

**insert throughput** (50k rows, median of 3):

| | rows/sec | vs before |
|---|---|---|
| before | 41,828 | — |
| after, pre-normalized input (production shape) | 27,759 | −34% |
| after, mixed-case input (trigger body runs) | 26,376 | −37% |

## Reading the results

**The count is the one that does not fully fix.** `gmail.com` stays around 300 ms because
counting 900k matching rows means visiting 900k rows, and no index changes that. The drop
from ~830 ms is `LIKE` replacing `ILIKE`. Capping the count
(`SELECT count(*) FROM (SELECT id FROM ... LIMIT 10000) t`) measured 13.6 ms in spot
checks, but changes what the UI can display and is not part of this change.

**The trigger is nearly free; the indexes are not.** Pre-normalized and mixed-case input
differ by ~2%, confirming the `WHEN` clause short-circuits before entering PL/pgSQL. The
whole write-side cost is index maintenance. Note this measures *bulk* insert (50k rows
per statement), the worst case for GIN maintenance; trickle single-row inserts profile
differently. `fastupdate` is on by default, and `gin_pending_list_limit` is the tuning
lever if write throughput binds.

**Statistics target matters more than it looks.** At the default target, the planner's
`LIKE` selectivity estimates for `nguyen` and `martinez` came out at 80,534 and 199 rows
respectively despite both matching ~40k — so it used the trigram index for one and not
the other, a 4x difference from nothing but estimation noise. The migration sets
`STATISTICS 1000` on `email`; dropping that makes the trigram gains a coin flip.

### Why both indexes ship

Recorded from a one-off attribution run (2M contacts, same setup). Reproduce it by
running with `BENCH_KEEP=1`, then dropping one index and re-measuring:

```sql
DROP INDEX "contacts_email_trgm_idx";              -- leaves the createdAt btree
DROP INDEX "contacts_projectId_createdAt_id_idx";  -- leaves the trigram index
```

page1, ms:

| term | matches | before | btree only | trgm only | both |
|---|---|---|---|---|---|
| `gmail.com` | 45% | 433 | **0.37** | 378 | **0.42** |
| `ez` | 16% | 355 | **0.96** | 137 | **0.98** |
| `nguyen` | 2% | 378 | **5.3** | 79 | **4.0** |
| `elena.pons` | 0.01% | 375 | 253 | **11.1** | **10.9** |
| `zzqx` | 0 | 343 | _585_ | **0.10** | **0.12** |
| _(no search)_ | — | 200 | **0.23** | 189 | **0.28** |

insert throughput, rows/sec: before 40,459 · btree only 36,965 (−9%) ·
trgm only 29,105 (−28%) · both 26,553 (−34%).

**Neither index works alone.** *btree only* fixes the high-frequency paths — the
unfiltered list and common search terms — but regresses a zero-match search to 585 ms,
worse than doing nothing: with no trigram alternative the planner walks the ordered index
across the whole project hunting for 21 rows that do not exist, instead of
parallel-scanning. Every prefix a user types before their term matches is a zero-match
search, so that case is common. *trgm only* fixes selective and zero-match terms but does
almost nothing for common ones, and **nothing at all** for the unfiltered list — that
query has no `email` predicate, so a trigram index on `email` cannot apply to it, and
that is the page every user lands on. *both* matches or beats each single-index
configuration everywhere; the btree's weakness on rare terms disappears once the planner
has a trigram alternative to switch to.

## Caveats

- Warm cache throughout. Production with a cold cache is slower across the board, which
  makes the relative wins larger, not smaller.
- Count figures are noisy: the same `nguyen` baseline measured 329, 392 and 816 ms across
  runs. Read them as order-of-magnitude, not precise. Page figures are stable to ~10%.
  Insert-throughput baselines range 40k-46k rows/sec between runs, so treat the
  percentage deltas as approximate; the ordering between configurations is stable.
  Insert throughput was unstable until the harness switched to a discarded warm-up plus
  median of 3 with a VACUUM between batches -- single-batch measurements of the same
  configuration ranged 27k-46k rows/sec.
- The synthetic email distribution (~45% gmail.com, fixed name corpus) determines the
  selectivity tiers. Real tenants differ, so treat the shape as indicative and the
  absolute numbers as specific to this corpus.
- No concurrent write load during measurement.
- GIN `fastupdate` defers index maintenance to a pending list, so even the corrected
  insert-throughput figure understates steady-state cost; some of it resurfaces during
  vacuum.
