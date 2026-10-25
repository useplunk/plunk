-- Transactional `delivery` options on POST /v1/send: scheduling (`delivery.at`) and
-- throttling (`delivery.throttle`).
--
-- Two new email statuses. ADD VALUE runs inside the migration's transaction on Postgres 12+;
-- the values are only used by application code after it commits.
--
-- `scheduledFor` is a nullable column with no default, so the ALTER is catalog-only on
-- "emails" regardless of its size. The partial index the scheduled-email sweep reads
-- ("scheduledFor" WHERE status = 'SCHEDULED') is deliberately NOT here: any index on
-- "emails" takes a full scan, and migrations run in the container entrypoint. It is built
-- after boot by apps/api/src/jobs/background-index-builder.ts.
--
-- "throttle_claims" is new and empty, so its indexes cost nothing to build here.
--
-- Workflows take the same throttle on entry: two nullable columns on the small "workflows"
-- table, catalog-only.

ALTER TYPE "EmailStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "EmailStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "throttleKey" TEXT,
ADD COLUMN     "throttleWindowSeconds" INTEGER;

-- CreateTable
CREATE TABLE "throttle_claims" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "recipientKey" TEXT NOT NULL,
    "contactId" TEXT,
    "emailId" TEXT,
    "workflowId" TEXT,
    "windowSeconds" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "throttle_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "throttle_claims_emailId_idx" ON "throttle_claims"("emailId");

-- CreateIndex
CREATE INDEX "throttle_claims_contactId_idx" ON "throttle_claims"("contactId");

-- CreateIndex
CREATE INDEX "throttle_claims_workflowId_idx" ON "throttle_claims"("workflowId");

-- CreateIndex
CREATE INDEX "throttle_claims_expiresAt_idx" ON "throttle_claims"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "throttle_claims_projectId_key_recipientKey_key" ON "throttle_claims"("projectId", "key", "recipientKey");

-- AddForeignKey
ALTER TABLE "throttle_claims" ADD CONSTRAINT "throttle_claims_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "throttle_claims" ADD CONSTRAINT "throttle_claims_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "throttle_claims" ADD CONSTRAINT "throttle_claims_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
