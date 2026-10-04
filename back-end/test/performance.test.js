import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewCache } from '../src/themes/preview-cache.js';
import { applyVote } from '../../front-end/src/services/votes.js';

test('preview cache deduplicates concurrent requests and is keyed by immutable package identity', async () => {
  let reads = 0;
  const cache = createPreviewCache(
    async () => {
      reads++;
      return Buffer.from('{}');
    },
    () => ({ settings: { sidebarOpacity: 35 } }),
  );
  const theme = { packagePath: 'one', fingerprint: 'a' };
  const [a, b] = await Promise.all([cache(theme), cache(theme)]);
  assert.strictEqual(a, b);
  assert.equal(reads, 1);
  await cache(theme);
  assert.equal(reads, 1);
  await cache({ ...theme, fingerprint: 'b' });
  assert.equal(reads, 2);
});

test('preview cache evicts older entries and retries failures rather than retaining them', async () => {
  let reads = 0,
    fail = true;
  const cache = createPreviewCache(
    async (path) => {
      reads++;
      if (path === 'bad' && fail) throw new Error('temporary');
      return path;
    },
    (value) => value,
    { limit: 1 },
  );
  const theme = (path) => ({ packagePath: path, fingerprint: path });
  await assert.rejects(cache(theme('bad')), /temporary/);
  fail = false;
  assert.equal(await cache(theme('bad')), 'bad');
  await cache(theme('one'));
  await cache(theme('bad'));
  assert.equal(reads, 4);
  const expired = createPreviewCache(
    async () => {
      reads++;
      return 'ok';
    },
    (value) => value,
    { ttl: -1 },
  );
  await expired(theme('one'));
  await expired(theme('one'));
  assert.equal(reads, 6);
});

test('reaction transitions update both counters without changing preview settings', () => {
  const base = { likes: 10, dislikes: 3, vote: 0, preview: { settings: { brightness: 50 } } };
  const like = applyVote(base, 1);
  assert.equal(like.likes, 11);
  assert.equal(like.dislikes, 3);
  const dislike = applyVote(like, -1);
  assert.equal(dislike.likes, 10);
  assert.equal(dislike.dislikes, 4);
  const clear = applyVote(dislike, 0);
  assert.equal(clear.likes, 10);
  assert.equal(clear.dislikes, 3);
  assert.strictEqual(clear.preview, base.preview);
  assert.equal(base.vote, 0);
});
