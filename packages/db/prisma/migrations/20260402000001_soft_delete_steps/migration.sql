-- AlterTable: Add soft-delete to WorkflowStep
ALTER TABLE "workflow_steps" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Make WorkflowStepExecution.stepId nullable with SetNull
ALTER TABLE "workflow_step_executions" ALTER COLUMN "stepId" DROP NOT NULL;

-- DropForeignKey: Change WorkflowStepExecution.stepId from Cascade to SetNull
ALTER TABLE "workflow_step_executions" DROP CONSTRAINT "workflow_step_executions_stepId_fkey";
ALTER TABLE "workflow_step_executions" ADD CONSTRAINT "workflow_step_executions_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey: Change WorkflowExecution.currentStepId to SetNull
ALTER TABLE "workflow_executions" DROP CONSTRAINT "workflow_executions_currentStepId_fkey";
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_currentStepId_fkey"
  FOREIGN KEY ("currentStepId") REFERENCES "workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
