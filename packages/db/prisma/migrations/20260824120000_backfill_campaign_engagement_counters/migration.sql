-- Backfill the campaign engagement counters from the emails that carry them.
--
-- Until `getStats` stopped recomputing on read, these columns were written as a side effect of
-- viewing a campaign: the endpoint counted the emails and wrote the result back, so any campaign
-- ever opened in the dashboard had correct numbers. Reading the columns directly is what made
-- the endpoint cheap, but it also froze every campaign that finalized before that change at the
-- `DEFAULT 0` the column was created with -- with no path back, since `reconcileStats` only runs
-- from `finalizeIfDone`, which returns early unless the campaign is still SENDING.
--
-- The result was a campaign reporting `delivered 0 · opened 0 · clicked 0 · bounced 0` over
-- thousands of recipients whose email rows carried every one of those events. This restores them.
--
-- Scoped to SENT campaigns on purpose. A campaign still SENDING holds its live sent progress in
-- Redis (`campaign:sent_progress:*`) as a delta on top of `sentCount`, and `reconcileStats` is
-- what folds the two together and drops the key. Touching an in-flight campaign here would race
-- that.
--
-- `sentCount` is deliberately NOT written, for the same reason: this migration cannot clear the
-- Redis delta, so writing the total would have it counted twice on the next read. Every report of
-- this bug has a correct `sentCount` regardless -- it is written by the send path, not by webhooks.
--
-- Cost: one sequential scan of "emails", grouped by campaign. No index serves predicates on
-- "deliveredAt"/"openedAt"/"clickedAt" alone, and building one for a single backfill is not worth
-- it. Expect roughly a minute per 50M rows. DDL-free, so this takes only ROW EXCLUSIVE on
-- "campaigns" and never blocks a reader under MVCC.
--
-- No lock_timeout, matching 20260821120000: the container entrypoint runs `migrate deploy` and
-- refuses to boot on failure, so a migration that gives up on a lock crash-loops the service
-- rather than degrading gracefully.
-- A statement_timeout inherited from the database or the pooler is the one thing that can turn
-- this into an outage: `migrate deploy` runs at container start and the entrypoint refuses to
-- boot on failure, so a killed backfill leaves a failed migration row and crash-loops the
-- service until someone clears it by hand -- the same reasoning that keeps lock_timeout out of
-- 20260821120000. Measured at ~3s per 10M emails (3GB heap, one non-parallel sequential scan;
-- the statement writes, so the planner cannot parallelise it), and bounded by read throughput
-- rather than row count: budget ~25s per 10M rows on a volume doing 125MB/s. Cleared for the
-- duration of this transaction only.
SET LOCAL statement_timeout = 0;

UPDATE "campaigns" AS c
SET "deliveredCount"  = totals.delivered,
    "openedCount"     = totals.opened,
    "clickedCount"    = totals.clicked,
    "bouncedCount"    = totals.bounced,
    "complainedCount" = totals.complained
FROM (
  SELECT e."campaignId"                                          AS campaign_id,
         count(*) FILTER (WHERE e."deliveredAt"  IS NOT NULL)::int AS delivered,
         count(*) FILTER (WHERE e."openedAt"     IS NOT NULL)::int AS opened,
         count(*) FILTER (WHERE e."clickedAt"    IS NOT NULL)::int AS clicked,
         count(*) FILTER (WHERE e."bouncedAt"    IS NOT NULL)::int AS bounced,
         count(*) FILTER (WHERE e."complainedAt" IS NOT NULL)::int AS complained
  FROM "emails" AS e
  WHERE e."campaignId" IS NOT NULL
  GROUP BY e."campaignId"
) AS totals
WHERE c."id" = totals.campaign_id
  AND c."status" = 'SENT'
  -- Skip rows that already agree, so the write set is only the campaigns that were actually
  -- wrong. On a large table that is the difference between a few thousand updated rows and
  -- every campaign ever sent, each with a dead tuple behind it.
  AND (c."deliveredCount", c."openedCount", c."clickedCount", c."bouncedCount", c."complainedCount")
      IS DISTINCT FROM (totals.delivered, totals.opened, totals.clicked, totals.bounced, totals.complained);

-- "unsubscribedCount" stays untouched: it is not derivable from the emails table, and the
-- reasoning in 20260821130000 for not guessing it still holds.
