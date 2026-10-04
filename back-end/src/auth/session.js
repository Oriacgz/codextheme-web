import { randomBytes } from 'node:crypto';
import {
  hash,
  SESSION_DAYS,
  sessionToken,
  csrfFor,
  equal,
  fail,
  setCookie,
  publicUser,
} from './security.js';
export async function currentSession(req, database) {
  const token = sessionToken(req);
  if (!token) return null;
  const session = await database.session.findUnique({
    where: { hash: hash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || session.user.suspended) return null;
  return { user: session.user, token, csrf: csrfFor(token) };
}
export async function requireUser(req, database, { write = false, admin = false } = {}) {
  const session = await currentSession(req, database);
  if (!session) fail(401, 'Sign in to continue.');
  if (write && !equal(req.headers['x-csrf-token'] || '', session.csrf))
    fail(403, 'Refresh the page and try again.');
  if (admin && session.user.role !== 'ADMIN') fail(403, 'Admin access required.');
  return session;
}
export async function signIn(res, database, user) {
  const token = randomBytes(32).toString('hex');
  await database.session.create({
    data: {
      hash: hash(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
    },
  });
  setCookie(res, token);
  return { user: { ...publicUser(user), email: user.email }, csrf: csrfFor(token) };
}
