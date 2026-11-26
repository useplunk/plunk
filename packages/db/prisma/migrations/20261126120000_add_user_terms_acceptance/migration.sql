-- Records which version of the Terms of Service and DPA a user accepted at signup, and when.
-- Nullable columns with no default, so the ALTER is catalog-only. Existing users stay NULL:
-- they accepted earlier versions before acceptance was recorded.
ALTER TABLE "users" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;
