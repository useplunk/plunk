-- When the recipient of a campaign email opted out from it -- by unsubscribe link or by
-- snooze -- stamped at the same moment `campaigns.unsubscribedCount` is incremented, so the
-- rows carrying it are exactly the list behind that figure. It is what lets the campaign
-- page drill into unsubscribes the way it already does into bounces and complaints:
-- before it, an opt-out was only an Event, and events carry no campaignId.
--
-- A nullable column with no default is catalog-only: existing rows are not rewritten and
-- the ALTER takes milliseconds regardless of table size.
--
-- The index the drill-down reads, a partial ("campaignId", "unsubscribedAt", "id") on the
-- stamped rows, is deliberately NOT here. Building any index on "emails" takes a full scan,
-- and migrations run in the container entrypoint, so it would hold startup for the length
-- of that scan. It is built after boot by apps/api/src/jobs/background-index-builder.ts.
--
-- Deliberately no backfill: historical opt-outs are stamped out of band by
-- apps/api/src/scripts/backfill-email-unsubscribed-at.ts.

-- AlterTable
ALTER TABLE "emails" ADD COLUMN "unsubscribedAt" TIMESTAMP(3);
