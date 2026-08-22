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

-- Fail rather than queue. ACCESS EXCLUSIVE waiters block every later lock request on the table,
-- so a DDL statement that sits behind one long-running query stalls all campaign traffic behind
-- it. Three seconds is far more than an uncontended catalog update needs.
--
-- On timeout the migration fails and is recorded as failed; clear it with
--   prisma migrate resolve --rolled-back 20260821120000_add_campaign_optout_counters
-- and deploy again when the table is quiet.
SET LOCAL lock_timeout = '3s';

-- AlterTable
ALTER TABLE "campaigns"
  ADD COLUMN "complainedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unsubscribedCount" INTEGER NOT NULL DEFAULT 0;
