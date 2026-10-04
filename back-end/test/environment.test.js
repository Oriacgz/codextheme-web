import { test } from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrl } from '../src/config/environment.js';
test('database settings accept the Vercel Postgres key with deterministic precedence', () => {
  const keys = ['DATABASE_URL', 'codexthemelibrary_POSTGRES_URL', 'codexthemelibrary_DATABASE_URL'];
  const original = keys.map((key) => process.env[key]);
  try {
    keys.forEach((key) => delete process.env[key]);
    assert.equal(databaseUrl(), undefined);
    process.env.codexthemelibrary_DATABASE_URL = 'postgresql://legacy';
    assert.equal(databaseUrl(), 'postgresql://legacy');
    process.env.codexthemelibrary_POSTGRES_URL = 'postgresql://vercel';
    assert.equal(databaseUrl(), 'postgresql://vercel');
    process.env.DATABASE_URL = 'postgresql://canonical';
    assert.equal(databaseUrl(), 'postgresql://canonical');
    process.env.DATABASE_URL = '';
    assert.equal(databaseUrl(), 'postgresql://vercel');
  } finally {
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  }
});
