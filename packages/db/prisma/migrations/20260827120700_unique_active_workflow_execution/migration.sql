-- Re-entry permits another execution only after the current one is terminal.
-- Keep the read-side check for a useful API error, but let PostgreSQL choose the
-- winner when separate events or API requests start concurrently.
CREATE UNIQUE INDEX CONCURRENTLY "workflow_executions_active_contact_key"
ON "workflow_executions"("workflowId", "contactId")
WHERE "status" IN ('RUNNING', 'WAITING');
