import { Prisma, PrismaClient } from '@prisma/client';
import type { Confirmed, Deceased, Recovered } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };
export type { Confirmed, Deceased, Recovered }