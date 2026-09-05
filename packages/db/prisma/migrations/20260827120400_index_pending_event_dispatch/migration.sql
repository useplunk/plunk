-- Only undelivered, retryable events participate in reconciliation. Excluding
-- processed history keeps this online-built index small and focused on the
-- maintenance worker's query.
CREATE INDEX CONCURRENTLY "events_dispatch_reconciliation_idx"
ON "events"("dispatchLeaseExpiresAt", "nextDispatchAt", "createdAt")
WHERE "processedAt" IS NULL AND "dispatchFailedAt" IS NULL;
