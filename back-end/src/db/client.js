import { databaseUrl } from '../config/environment.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
let client;
export function db() {
  if (!databaseUrl()) {
    const error = new Error('Connect Prisma Postgres to enable accounts and community uploads.');
    error.status = 503;
    throw error;
  }
  return (client ||= new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl(), max: 3 }),
  }));
}
