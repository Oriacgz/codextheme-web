import { db } from '../src/db/client.js';
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(file);
  } catch {}
}
const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error('Usage: npm run admin -- existing-account@example.com');
const database = db();
try {
  const user = await database.user.update({ where: { email }, data: { role: 'ADMIN' } });
  console.log(`Admin access granted to ${user.email}. Sign in again to refresh the interface.`);
} finally {
  await database.$disconnect();
}
