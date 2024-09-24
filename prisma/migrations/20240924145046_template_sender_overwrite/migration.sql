-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "email" TEXT,
ADD COLUMN     "from" TEXT;

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "email" TEXT,
ADD COLUMN     "from" TEXT;
