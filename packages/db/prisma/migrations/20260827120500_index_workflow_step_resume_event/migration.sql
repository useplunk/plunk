-- A failed continuation is looked up by its source event on every retry. Build
-- that relation index without blocking workflow-step writes during deploy.
CREATE INDEX CONCURRENTLY "workflow_step_executions_resumeEventId_idx"
ON "workflow_step_executions"("resumeEventId");
