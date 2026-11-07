-- Per-template, per-campaign and per-email overrides of the project's TrackingMode.
--
-- All three are nullable columns with no default (null = follow the project), so each ALTER
-- is catalog-only regardless of table size.

-- AlterTable
ALTER TABLE "templates" ADD COLUMN "tracking" BOOLEAN;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "tracking" BOOLEAN;

-- AlterTable
ALTER TABLE "emails" ADD COLUMN "trackingOverride" BOOLEAN;
