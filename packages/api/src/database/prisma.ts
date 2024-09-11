import { PrismaClient } from '@prisma/client';
import { contacts, rawActionClicks } from '@prisma/client/sql';
import signale from 'signale';

let prisma: PrismaClient;
try {
  prisma = new PrismaClient();
  signale.info('Prisma initialized');
} catch (error) {
  signale.error('Failed to initialize Prisma: ', error);
}
const sql = {
  contacts,
  rawActionClicks
}
export { prisma, sql };
