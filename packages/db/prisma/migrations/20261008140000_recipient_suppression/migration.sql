ALTER TYPE "EmailStatus" ADD VALUE 'SUPPRESSED';
ALTER TABLE "emails" ADD COLUMN "recipientAddress" TEXT, ADD COLUMN "suppression" JSONB, ADD COLUMN "renderedSubject" TEXT, ADD COLUMN "renderedBody" TEXT;
CREATE TABLE "recipient_suppression_rules" (
 "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "kind" TEXT NOT NULL, "pattern" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "recipient_suppression_rules_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "recipient_suppression_rules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "recipient_suppression_rules_projectId_enabled_idx" ON "recipient_suppression_rules"("projectId", "enabled");
CREATE INDEX "emails_projectId_status_createdAt_id_idx" ON "emails"("projectId", "status", "createdAt", "id");
