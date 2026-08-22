-- What a campaign cost in recipients: spam complaints and deliberate unsubscribes, alongside
-- the bounces already counted.
--
-- Both are materialized like the existing campaign counters. Counting either on read means
-- scanning or joining a campaign's emails on every view of it, and a campaign can have millions.
--
-- This file is DDL only, and deliberately holds no backfill. Prisma runs a migration as one
-- transaction, so ADD COLUMN's ACCESS EXCLUSIVE lock on "campaigns" is held until the
-- transaction commits -- any backfill in here would keep the table unreadable for the length of
-- its scan, blocking the campaign list, sends, and the scheduler cron. The complaint backfill
-- is a separate migration for exactly that reason.
--
-- Adding an INTEGER column with a constant default is metadata-only on PostgreSQL 11+, so this
-- takes milliseconds however large the table is.

-- No lock_timeout here on purpose. Fail-fast is the wrong trade for this deployment model: the
-- container entrypoint runs `migrate deploy` at start and refuses to boot on failure, so a
-- migration that gives up on a lock does not degrade gracefully, it crash-loops the service
-- until a human clears the failed row by hand. Waiting for the lock is the lesser harm, and
-- this statement is a metadata-only catalog update that normally acquires it instantly.

-- AlterTable
ALTER TABLE "campaigns"
  ADD COLUMN "complainedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unsubscribedCount" INTEGER NOT NULL DEFAULT 0;
