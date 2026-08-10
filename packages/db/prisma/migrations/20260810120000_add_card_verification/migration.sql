-- Card verification: prove the card accepts a merchant-initiated charge at onboarding
-- rather than discovering it on the first renewal, a month of unbilled sending later.

-- CreateEnum
CREATE TYPE "CardVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REQUIRES_ACTION', 'FAILED');

-- AlterEnum
-- Prisma runs this file as one implicit transaction. PostgreSQL 12+ permits ADD VALUE there
-- as long as the new value is not *used* in the same transaction, which it isn't below.
ALTER TYPE "ProjectDisabledReason" ADD VALUE 'CARD_VERIFICATION_FAILED';

-- AlterTable
-- "cardVerification" is left NULL for existing projects on purpose: they predate verification
-- and must not be treated as unverified, which would both strand them behind the dashboard
-- banner and pull every one of them into the reconciliation sweep.
--
-- "cardVerificationAt" exists rather than reusing "updatedAt" because any unrelated project
-- edit bumps that column -- a project touched regularly would never look stale to the sweep.
--
-- "cardVerificationSession" is kept so a sweep retry reuses the same Stripe idempotency key.
-- Retrying with a fresh key could charge a second time in the very case the sweep exists for,
-- where the charge succeeded but recording it did not.
--
-- "cardVerificationAttempts" bounds those retries and doubles as the escalation marker, so a
-- project that can never be verified is alerted on once rather than on every sweep.
ALTER TABLE "projects" ADD COLUMN "cardVerification" "CardVerificationStatus",
                       ADD COLUMN "cardVerificationIntent" TEXT,
                       ADD COLUMN "cardVerificationAt" TIMESTAMP(3),
                       ADD COLUMN "cardVerificationSession" TEXT,
                       ADD COLUMN "cardVerificationAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "projects_cardVerification_cardVerificationAt_idx" ON "projects"("cardVerification", "cardVerificationAt");
