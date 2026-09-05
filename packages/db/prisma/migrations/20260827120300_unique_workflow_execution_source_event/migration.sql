-- The unique index is the concurrency guard for duplicate enrollment from one
-- event. Build it without blocking workflow-execution writes during deploy.
CREATE UNIQUE INDEX CONCURRENTLY "workflow_executions_workflowId_sourceEventId_key"
ON "workflow_executions"("workflowId", "sourceEventId");
