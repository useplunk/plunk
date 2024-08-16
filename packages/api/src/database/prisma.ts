import {PrismaClient} from '@prisma/client';
import signale from 'signale';

let prisma: PrismaClient;
try {
  prisma = new PrismaClient();
  signale.info('Prisma initialized');
} catch (error) {
  signale.error('Failed to initialize Prisma: ', error);
}
export {prisma};
