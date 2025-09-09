-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "baseTemplate" TEXT,
ADD COLUMN     "unsubscribeFooter" TEXT,
ADD COLUMN     "templatingLanguage" TEXT NOT NULL DEFAULT 'DEFAULT';
