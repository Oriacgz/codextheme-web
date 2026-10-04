import { startPrismaDevServer } from '@prisma/dev';
const server = await startPrismaDevServer({
  name: 'codexskin-community',
  persistenceMode: 'stateful',
  port: 51313,
  databasePort: 51314,
  shadowDatabasePort: 51315,
  streamsPort: 51316,
});
console.log('Local development database ready. Keep this terminal running.');
console.log('Set DATABASE_URL in back-end/.env.local to this local-only URL:');
console.log(server.database.connectionString);
async function close() {
  await server.close();
  process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
