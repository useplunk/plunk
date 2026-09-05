-- Archiving: hide a campaign from the default list without deleting it.
--
-- This is deliberately a boolean and NOT a sixth "CampaignStatus" value. Archiving is
-- orthogonal to lifecycle -- a campaign is both SENT and archived -- so folding it into the
-- enum would make every status query ambiguous and would lose the campaign's real state the
-- moment it was archived.
--
-- It exists because a campaign list can only ever grow: CampaignService.delete and the
-- bulk-delete branch both refuse anything that is not a DRAFT, so a project's sent campaigns
-- are permanent. Archiving gives that list a floor without touching the send history, the
-- materialized counters, or the emails behind them.
--
-- No backfill migration accompanies this one, unlike the campaign counter columns. Those
-- needed one because 0 was the wrong value for existing rows; here `false` is correct for
-- every row that already exists, by definition -- nothing has been archived yet.
--
-- Adding a BOOLEAN column with a constant default is metadata-only on PostgreSQL 11+, so the
-- ALTER takes milliseconds however large the table is and does not rewrite it.

-- No lock_timeout here on purpose, matching the other campaign migrations. Fail-fast is the
-- wrong trade for this deployment model: the container entrypoint runs `migrate deploy` at
-- start and refuses to boot on failure, so a migration that gives up on a lock does not
-- degrade gracefully, it crash-loops the service until a human clears the failed row by hand.

-- AlterTable
ALTER TABLE "campaigns"
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- Serves the scoped list (every campaign list query now filters projectId + archived and
-- orders by createdAt DESC by default) and, through its projectId+archived prefix, the
-- archived-count query behind the list's Archived toggle.
--
-- Plain CREATE INDEX rather than CONCURRENTLY: Prisma wraps a migration in a single
-- transaction and CONCURRENTLY is illegal inside one. That is the same trade the emails
-- (campaignId, status) index migration made, and "campaigns" is orders of magnitude smaller
-- than "emails", so the build is short.

-- CreateIndex
CREATE INDEX "campaigns_projectId_archived_createdAt_idx" ON "campaigns"("projectId", "archived", "createdAt");
