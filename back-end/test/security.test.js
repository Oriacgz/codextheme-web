import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  passwordHash,
  passwordMatches,
  credentials,
  themeMetadata,
  checkOrigin,
  equal,
  csrfFor,
  readBody,
  publicUser,
  sessionToken,
  rateLimit,
  jsonBody,
} from '../src/auth/security.js';
import { checkedPath } from '../src/storage/objects.js';
import { currentSession, requireUser } from '../src/auth/session.js';

test('passwords use random salts and reject incorrect passwords', async () => {
  const a = await passwordHash('a long password for testing'),
    b = await passwordHash('a long password for testing');
  assert.notEqual(a, b);
  assert.equal(await passwordMatches('a long password for testing', a), true);
  assert.equal(await passwordMatches('wrong password', a), false);
  assert.equal(await passwordMatches('x', 'broken'), false);
});
test('registration, metadata and avatar privacy enforce input boundaries', () => {
  assert.equal(
    credentials({ email: ' A@EXAMPLE.com ', password: 'long enough password' }).email,
    'a@example.com',
  );
  assert.throws(() => credentials({ email: 'bad', password: 'tiny' }));
  assert.throws(() =>
    themeMetadata({
      name: 'abc',
      description: 'a description',
      category: 'Dark',
      license: 'CC0',
      rights: false,
    }),
  );
  assert.deepEqual(
    publicUser({
      id: 'id',
      name: 'A',
      role: 'USER',
      avatar: 1,
      email: 'secret',
      passwordHash: 'secret',
    }),
    { id: 'id', name: 'A', role: 'USER', avatar: 1 },
  );
  for (const key of [
    '../secret',
    'incoming/../../secret.zip',
    'https://evil.test/a.zip',
    'previews/a.svg',
  ])
    assert.throws(() => checkedPath(key));
});
test('mutations reject foreign origins and invalid CSRF values', () => {
  const old = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = 'https://community.example';
  try {
    assert.doesNotThrow(() => checkOrigin({ headers: { origin: 'https://community.example' } }));
    assert.throws(() => checkOrigin({ headers: { origin: 'https://evil.example' } }), {
      status: 403,
    });
  } finally {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  }
  assert.equal(equal(csrfFor('one'), csrfFor('two')), false);
  assert.equal(equal('a', 'longer'), false);
  assert.equal(sessionToken({ headers: { cookie: 'community_session=invalid' } }), null);
});
test('admin and suspended-account boundaries are enforced by the server', async () => {
  const token = 'a'.repeat(64),
    req = { headers: { cookie: 'community_session=' + token, 'x-csrf-token': csrfFor(token) } };
  const user = { id: 'user', role: 'USER', suspended: false };
  const database = {
    session: { findUnique: async () => ({ user, expiresAt: new Date(Date.now() + 60000) }) },
  };
  assert.equal((await requireUser(req, database, { write: true })).user.id, 'user');
  await assert.rejects(requireUser(req, database, { admin: true }), { status: 403 });
  await assert.rejects(
    requireUser({ headers: { cookie: req.headers.cookie, 'x-csrf-token': 'bad' } }, database, {
      write: true,
    }),
    { status: 403 },
  );
  user.role = 'ADMIN';
  user.mustChangePassword = true;
  await assert.rejects(requireUser(req, database, { write: true }), { status: 403 });
  await assert.rejects(requireUser(req, database, { admin: true }), { status: 403 });
  assert.equal((await requireUser(req, database, { write: true, admin: true, allowTemporary: true })).user.id, 'user');
  user.suspended = true;
  assert.equal(await currentSession(req, database), null);
});
test('body limits stop oversized requests and rate buckets stop repeated writes', async () => {
  const req = Readable.from([Buffer.alloc(5)]);
  req.headers = {};
  await assert.rejects(readBody(req, 4), { status: 413 });
  let count = 0;
  const database = { rateBucket: { upsert: async () => ({ count: ++count }) } };
  await rateLimit(database, 'login-test', 1);
  await assert.rejects(rateLimit(database, 'login-test', 1), { status: 429 });
});

test('JSON endpoints reject arrays and null before reading input fields', async () => {
  for (const input of ['null', '[]', '"text"']) {
    const req = Readable.from([input]);
    req.headers = {};
    await assert.rejects(jsonBody(req), { status: 400 });
  }
  await assert.rejects(jsonBody({ body: [], headers: {} }), { status: 400 });
});
