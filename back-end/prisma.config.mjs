import { databaseUrl } from './src/config/environment.js';
import { defineConfig } from 'prisma/config';
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(file);
  } catch {}
}
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: databaseUrl() || 'postgresql://postgres:postgres@127.0.0.1:51314/template1' },
});
