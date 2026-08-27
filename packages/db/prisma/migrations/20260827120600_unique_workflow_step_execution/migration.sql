-- A workflow step is a once-only unit of work. The executor catches this
-- constraint when duplicate workers race to claim the same step.
CREATE UNIQUE INDEX CONCURRENTLY "workflow_step_executions_executionId_stepId_key"
ON "workflow_step_executions"("executionId", "stepId");
