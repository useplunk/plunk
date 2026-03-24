-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "disableFooter" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "disableFooter" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "disableFooter" BOOLEAN NOT NULL DEFAULT false;
