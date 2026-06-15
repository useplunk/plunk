-- Composite (campaignId, status) index supporting the campaign-completion probe
-- in CampaignService.finalizeIfDone. That probe runs once per sent email, so it
-- must be an index-only LIMIT 1 lookup ("is any email for this campaign still
-- PENDING or SENDING?") rather than a full per-email recount of the campaign.
CREATE INDEX "emails_campaignId_status_idx" ON "emails"("campaignId", "status");
