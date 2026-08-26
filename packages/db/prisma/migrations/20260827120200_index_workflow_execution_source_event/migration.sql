-- This table may already hold millions of executions. CONCURRENTLY keeps
-- normal reads and writes available while PostgreSQL builds the relation index.
CREATE INDEX CONCURRENTLY "workflow_executions_sourceEventId_idx"
ON "workflow_executions"("sourceEventId");
