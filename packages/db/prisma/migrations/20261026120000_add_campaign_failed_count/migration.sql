-- How many of a campaign's recipients the send never reached: emails that ended FAILED
-- without SES ever accepting them, plus the most common errors behind them. Before this, a
-- campaign whose tail failed (most often because the SES daily quota ran out mid-send)
-- finalized as a plain SENT with a partial sentCount, indistinguishable from a send that
-- reached everyone.
--
-- Both ADD COLUMNs are catalog-only on PostgreSQL 11+ (a constant default, and a nullable
-- column with none): existing rows are not rewritten and they take milliseconds regardless
-- of table size.
--
-- Deliberately no backfill. Counting failures for every historical campaign would scan the
-- "emails" table inside the container entrypoint. Both columns are written when a send
-- finalizes -- including campaigns left stuck in SENDING by the bug this fixes, which the
-- stats sweep now finalizes. Campaigns that finished earlier report 0 until something
-- recounts them.

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "failureReasons" JSONB;

-- The stalled-campaign sweep looks up every SENDING campaign across all projects every
-- couple of minutes, which no existing index serves ("status" is only the second column of
-- ("projectId", "status")). Built inline because "campaigns" holds one row per campaign,
-- not per recipient, so the build is short, unlike an index on "emails".
CREATE INDEX "campaigns_status_sentAt_idx" ON "campaigns"("status", "sentAt");
