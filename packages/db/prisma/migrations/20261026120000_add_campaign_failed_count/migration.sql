-- How many of a campaign's recipients the send never reached: emails that ended FAILED
-- without SES ever accepting them. Before this, a campaign whose tail failed (most often
-- because the SES daily quota ran out mid-send) finalized as a plain SENT with a partial
-- sentCount, indistinguishable from a send that reached everyone.
--
-- A NOT NULL column with a constant default is catalog-only on PostgreSQL 11+: existing
-- rows are not rewritten and the ALTER takes milliseconds regardless of table size.
--
-- Deliberately no backfill. Counting failures for every historical campaign would scan the
-- "emails" table inside the container entrypoint. The counter is written by
-- CampaignService.reconcileStats, which runs when a send finalizes -- including campaigns
-- left stuck in SENDING by the bug this fixes, which the stats sweep now finalizes.

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "failedCount" INTEGER NOT NULL DEFAULT 0;
