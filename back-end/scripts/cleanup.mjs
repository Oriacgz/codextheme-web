// Scheduled/manual maintenance. No published files are removed.
import { db } from '../src/db/client.js';
import { removeObject } from '../src/storage/objects.js';
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(file);
  } catch {}
}
const database = db(),
  now = new Date();
try {
  const abandoned = await database.upload.findMany({
    where: { expiresAt: { lt: now }, themeId: null },
    take: 100,
  });
  for (const upload of abandoned) {
    await removeObject(upload.pathname);
    await database.upload.delete({ where: { id: upload.id } });
  }
  await database.activitySeen.deleteMany({ where: { expiresAt: { lt: now } } });
  await database.activityDaily.deleteMany({ where: { day: { lt: new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10) } } });
  await database.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await database.rateBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  console.log(`Removed ${abandoned.length} expired unpublished uploads.`);
} finally {
  await database.$disconnect();
}
