import { createServer } from 'node:http';
import handler from './http/handler.js';
import { databaseUrl } from './config/environment.js';
import { secret } from './auth/security.js';

if (!databaseUrl()) throw new Error('Database connection is not configured.');
secret();
const origin = new URL(process.env.APP_ORIGIN);
if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')
  throw new Error('Production APP_ORIGIN must use HTTPS.');
const server = createServer((req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } else if (path === '/api/community') void handler(req, res);
  else {
    res.statusCode = 404;
    res.end();
  }
});
server.listen(Number(process.env.PORT || 10000), '0.0.0.0', () =>
  console.log('Community API listening.'),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
