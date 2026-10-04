import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import proxy from '../../api/community.js';
import { isProduction } from '../src/config/environment.js';
import { cookieName, secret } from '../src/auth/security.js';

test('production security applies on Render without VERCEL', () => {
  const previous = {
    node: process.env.NODE_ENV,
    secret: process.env.SESSION_SECRET,
    vercel: process.env.VERCEL,
  };
  try {
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    assert.equal(isProduction(), true);
    assert.equal(cookieName(), '__Host-community_session');
    assert.throws(secret, { status: 503 });
  } finally {
    for (const [key, value] of [
      ['NODE_ENV', previous.node],
      ['SESSION_SECRET', previous.secret],
      ['VERCEL', previous.vercel],
    ])
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});

test('proxy forwards parsed JSON, cookies and origin; rejects invalid backend configuration', async () => {
  const previous = process.env.BACKEND_URL,
    originalFetch = globalThis.fetch;
  process.env.BACKEND_URL = 'https://example.onrender.com';
  globalThis.fetch = async (url, options) => {
    assert.equal(url.hostname, 'example.onrender.com');
    assert.equal(options.headers.origin, 'https://example.vercel.app');
    assert.equal(options.body, JSON.stringify({ value: 1 }));
    return new Response('{"vote":1}', {
      headers: {
        'content-type': 'application/json',
        'set-cookie': '__Host-community_session=test; Path=/; Secure; HttpOnly',
      },
    });
  };
  const server = createServer((req, res) => {
    req.body = { value: 1 };
    void proxy(req, res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const call = () =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: '127.0.0.1',
          port: server.address().port,
          path: '/api/community?route=vote',
          method: 'POST',
          headers: { origin: 'https://example.vercel.app' },
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res));
        },
      );
      req.on('error', reject);
      req.end();
    });
  try {
    const response = await call();
    assert.equal(response.statusCode, 200);
    assert.match(response.headers['set-cookie'][0], /Secure/);
    process.env.BACKEND_URL = 'http://example.onrender.com';
    assert.equal((await call()).statusCode, 502);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previous;
    await new Promise((resolve) => server.close(resolve));
  }
});
