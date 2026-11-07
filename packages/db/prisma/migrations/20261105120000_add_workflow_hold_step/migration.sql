-- HOLD workflow steps: the end of a workflow that keeps growing, where contacts wait for the steps
-- added above it.
--
-- ADD VALUE runs inside the migration's transaction on Postgres 12+; the values are only used by
-- application code after it commits.
--
-- "holdTransitionId" is nullable, with no default and no foreign key, so the ALTER is catalog-only on
-- "workflow_executions" whatever its size. Its index is built after boot by
-- apps/api/src/jobs/background-index-builder.ts.

ALTER TYPE "WorkflowStepType" ADD VALUE 'HOLD';
ALTER TYPE "WorkflowExecutionStatus" ADD VALUE 'HELD';

-- AlterTable
ALTER TABLE "workflow_executions" ADD COLUMN     "holdTransitionId" TEXT;
