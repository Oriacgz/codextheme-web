import { readObject } from '../storage/objects.js';
import { readThemeManifest } from './package.js';

// Packages are immutable. Cache only their public appearance data, never access decisions.
export function createPreviewCache(
  read = readObject,
  parse = readThemeManifest,
  { limit = 128, ttl = 600000 } = {},
) {
  const entries = new Map();
  return async function getPreview(theme) {
    const key = `${theme.packagePath}:${theme.fingerprint}`;
    const cached = entries.get(key);
    if (cached && cached.expires > Date.now()) {
      entries.delete(key);
      entries.set(key, cached);
      return cached.promise;
    }
    const entry = { expires: Date.now() + ttl };
    entry.promise = Promise.resolve()
      .then(() => read(theme.packagePath))
      .then(parse)
      .catch((error) => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > limit) entries.delete(entries.keys().next().value);
    return entry.promise;
  };
}
export const getThemePreview = createPreviewCache();
