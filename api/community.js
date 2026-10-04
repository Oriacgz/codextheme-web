import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export default async function handler(req, res) {
  try {
    const backend = new URL(process.env.BACKEND_URL);
    if (
      backend.protocol !== 'https:' ||
      backend.username ||
      backend.password ||
      backend.pathname !== '/'
    )
      throw new Error('Invalid backend origin');
    const url = new URL(req.url, backend);
    const headers = {};
    for (const name of ['content-type', 'cookie', 'origin', 'x-csrf-token', 'if-none-match'])
      if (req.headers[name]) headers[name] = req.headers[name];
    const response = await fetch(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : req.body !== undefined
          ? Buffer.isBuffer(req.body) || typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body)
          : req,
      duplex: 'half',
      redirect: 'manual',
      signal: AbortSignal.timeout(55000),
    });
    res.statusCode = response.status;
    for (const name of [
      'content-type',
      'content-disposition',
      'cache-control',
      'etag',
      'x-content-type-options',
    ])
      if (response.headers.has(name)) res.setHeader(name, response.headers.get(name));
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    if (response.body) await pipeline(Readable.fromWeb(response.body), res);
    else res.end();
  } catch {
    if (res.headersSent) return res.destroy();
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'The server is unavailable. Please try again shortly.' }));
  }
}
