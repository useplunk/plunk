-- Link event-triggered workflow executions to the durable source event. The
-- reconciliation sweep uses this identity to recognize completed enrollment
-- without replaying workflow side effects.

ALTER TABLE "workflow_executions" ADD COLUMN "sourceEventId" TEXT;
ALTER TABLE "workflow_step_executions" ADD COLUMN "resumeEventId" TEXT;

ALTER TABLE "events"
ADD COLUMN "dispatchAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextDispatchAt" TIMESTAMP(3),
ADD COLUMN "dispatchFailedAt" TIMESTAMP(3),
ADD COLUMN "dispatchError" TEXT,
ADD COLUMN "dispatchLeaseId" TEXT,
ADD COLUMN "dispatchLeaseExpiresAt" TIMESTAMP(3);

ALTER TABLE "workflow_executions"
ADD CONSTRAINT "workflow_executions_sourceEventId_fkey"
FOREIGN KEY ("sourceEventId") REFERENCES "events"("id")
ON DELETE SET NULL ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "workflow_step_executions"
ADD CONSTRAINT "workflow_step_executions_resumeEventId_fkey"
FOREIGN KEY ("resumeEventId") REFERENCES "events"("id")
ON DELETE SET NULL ON UPDATE CASCADE
NOT VALID;
