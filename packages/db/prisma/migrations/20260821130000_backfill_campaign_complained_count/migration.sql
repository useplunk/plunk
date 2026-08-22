-- Backfill "campaigns"."complainedCount" from the emails that drew the complaints.
--
-- Separate from the migration that added the column so this runs in its own transaction: with no
-- DDL here, the statement takes only ROW EXCLUSIVE on "campaigns", which does not block readers
-- under MVCC. The scan can take minutes without anyone noticing.
--
-- Cost: a sequential scan of "emails". No index serves a predicate on "complainedAt" alone --
-- the only index over that column leads with "contactId" -- and adding one for a single
-- backfill is not worth the build. Expect roughly a minute per 50M rows, more if bodies are
-- small enough to sit inline in the heap rather than in TOAST.
--
-- Exact and complete for all history: every complaint SES ever reported set "complainedAt" on
-- the email it came from.
UPDATE "campaigns" AS c
SET "complainedCount" = complained.count
FROM (
  SELECT e."campaignId" AS campaign_id, COUNT(*) AS count
  FROM "emails" AS e
  WHERE e."campaignId" IS NOT NULL
    AND e."complainedAt" IS NOT NULL
  GROUP BY e."campaignId"
) AS complained
WHERE c."id" = complained.campaign_id;

-- "unsubscribedCount" is deliberately NOT backfilled, and stays at 0 for every existing campaign.
--
-- Attributing an unsubscribe to a campaign needs the "?e=" parameter that unsubscribe links only
-- started carrying with this change. Older links were scoped to the contact alone, so for
-- historical opt-outs the originating email was never recorded and cannot be recovered. Any
-- backfill would either find almost nothing while scanning the largest table in the schema, or
-- guess -- and a guessed number in a stats column is worse than an honest zero.
--
-- CampaignService.getStats recomputes the column on every read, so a campaign viewed in the
-- dashboard corrects itself from whatever attributed events do exist.
