import { isProduction } from '../config/environment.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { get, put, del } from '@vercel/blob';
import { fail } from '../auth/security.js';
const root = fileURLToPath(new URL('../../.data/uploads/', import.meta.url));
export const PACKAGE_LIMIT = 32 * 1024 * 1024;
function checkedPath(key) {
  if (
    !/^(incoming|previews)\/[a-f0-9-]{36}\/[a-f0-9-]{36}(?:-[a-f0-9]{12})?\.(zip|codextheme|jpg)$/.test(
      key,
    )
  )
    fail(400, 'Invalid storage key.');
  return key;
}
function localPath(key) {
  return path.join(root, checkedPath(key));
}
function localOnly() {
  if (isProduction()) fail(503, 'Connect a private Vercel Blob store to enable uploads.');
}
export async function writeObject(key, bytes, contentType) {
  checkedPath(key);
  if (process.env.BLOB_READ_WRITE_TOKEN)
    return put(key, bytes, {
      access: 'private',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  localOnly();
  const file = localPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
  return { pathname: key };
}
export async function readObject(key, limit = PACKAGE_LIMIT) {
  checkedPath(key);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    localOnly();
    const file = localPath(key),
      stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit)
      fail(413, 'File exceeds the size limit.');
    const bytes = await fs.readFile(file);
    if (bytes.length > limit) fail(413, 'File exceeds the size limit.');
    return bytes;
  }
  const result = await get(key, { access: 'private' });
  if (!result || result.statusCode !== 200) fail(404, 'Upload is not available yet. Please retry.');
  const chunks = [];
  let total = 0;
  for await (const chunk of Readable.fromWeb(result.stream)) {
    total += chunk.length;
    if (total > limit) fail(413, 'File exceeds the size limit.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}
export async function removeObject(key) {
  checkedPath(key);
  if (process.env.BLOB_READ_WRITE_TOKEN) await del(key);
  else {
    localOnly();
    await fs.unlink(localPath(key)).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
export async function packageStream(key) {
  checkedPath(key);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await get(key, { access: 'private' });
    if (!result || result.statusCode !== 200) fail(404, 'Package unavailable.');
    return Readable.fromWeb(result.stream);
  }
  localOnly();
  const { createReadStream } = await import('node:fs');
  return createReadStream(localPath(key));
}
export { checkedPath };
