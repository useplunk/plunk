-- Validation uses a lock that permits normal reads and writes. Keeping it
-- separate from constraint creation avoids a blocking validation scan while
-- the foreign key is installed.
ALTER TABLE "workflow_executions"
VALIDATE CONSTRAINT "workflow_executions_sourceEventId_fkey";

ALTER TABLE "workflow_step_executions"
VALIDATE CONSTRAINT "workflow_step_executions_resumeEventId_fkey";
