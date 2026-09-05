-- Durable SNS delivery receipts. The unique MessageId claim serializes concurrent
-- deliveries, while FAILED and stale PROCESSING rows remain reclaimable after a
-- handler or process failure.

-- CreateEnum
CREATE TYPE "SnsWebhookReceiptStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "sns_webhook_receipts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "SnsWebhookReceiptStatus" NOT NULL DEFAULT 'PROCESSING',
    "processingToken" TEXT NOT NULL,
    "processingStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sns_webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sns_webhook_receipts_messageId_key" ON "sns_webhook_receipts"("messageId");

-- CreateIndex
CREATE INDEX "sns_webhook_receipts_expiresAt_idx" ON "sns_webhook_receipts"("expiresAt");

-- Make event ingestion durable before workflow dispatch. Existing events have
-- already passed through the synchronous dispatcher and must not be replayed.
ALTER TABLE "events" ADD COLUMN "processedAt" TIMESTAMP(3);
UPDATE "events" SET "processedAt" = "createdAt";
CREATE INDEX "events_processedAt_createdAt_idx" ON "events"("processedAt", "createdAt");
