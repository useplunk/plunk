-- CreateEnum
CREATE TYPE "WorkflowWaitOutcome" AS ENUM ('EVENT', 'TIMEOUT');

-- AlterTable
ALTER TABLE "workflow_transitions" ADD COLUMN "waitOutcome" "WorkflowWaitOutcome";

-- Existing WAIT_FOR_EVENT transitions were linear: the same next step handled
-- both an arriving event and a configured timeout. Preserve that behavior while
-- moving the route out of the generic condition JSON.
UPDATE "workflow_transitions" AS transition
SET
  "waitOutcome" = CASE
    WHEN transition."condition"->>'branch' = 'timeout'
      OR transition."condition"->>'fallback' = 'true'
      THEN 'TIMEOUT'::"WorkflowWaitOutcome"
    ELSE 'EVENT'::"WorkflowWaitOutcome"
  END,
  "condition" = NULL
FROM "workflow_steps" AS step
WHERE transition."fromStepId" = step."id"
  AND step."type" = 'WAIT_FOR_EVENT';

-- A legacy unconditional wait transition was taken for either outcome. When a
-- timeout is configured, duplicate its target as the explicit timeout route.
INSERT INTO "workflow_transitions" (
  "id",
  "fromStepId",
  "toStepId",
  "condition",
  "waitOutcome",
  "priority",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  transition."fromStepId",
  transition."toStepId",
  NULL,
  'TIMEOUT'::"WorkflowWaitOutcome",
  transition."priority" + 1,
  transition."createdAt",
  transition."updatedAt"
FROM "workflow_transitions" AS transition
JOIN "workflow_steps" AS step ON step."id" = transition."fromStepId"
WHERE step."type" = 'WAIT_FOR_EVENT'
  AND transition."waitOutcome" = 'EVENT'
  AND jsonb_typeof(step."config"->'timeout') = 'number'
  AND (step."config"->>'timeout')::double precision > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "workflow_transitions" AS timeout_transition
    WHERE timeout_transition."fromStepId" = transition."fromStepId"
      AND timeout_transition."waitOutcome" = 'TIMEOUT'
  );

-- CreateIndex
CREATE UNIQUE INDEX "workflow_transitions_fromStepId_waitOutcome_key"
ON "workflow_transitions"("fromStepId", "waitOutcome");
