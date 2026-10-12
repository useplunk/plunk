-- Card verification recovery: a card change re-runs verification, so a project paused for its
-- card can recover on its own instead of staying disabled after the customer fixes it.

-- AlterEnum
-- Safe inside Prisma's implicit transaction: the new value is not used below.
ALTER TYPE "ProjectDisabledReason" ADD VALUE 'CARD_VERIFICATION_REQUIRED';

-- AlterTable
-- "cardVerificationPaymentMethod" is the card the current attempt tests. One card change in the
-- portal fires several webhooks; claiming this column is what stops them charging twice.
--
-- "cardVerificationFingerprint" is the last card that passed, so re-adding the same physical
-- card under a new payment method id does not cost the customer another charge.
ALTER TABLE "projects" ADD COLUMN "cardVerificationPaymentMethod" TEXT,
                       ADD COLUMN "cardVerificationFingerprint" TEXT;
