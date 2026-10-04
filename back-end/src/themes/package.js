import yauzl from 'yauzl';
import sharp from 'sharp';
import colorString from 'color-string';
import { crc32 } from 'node:zlib';

const MIB = 1024 * 1024;
const IMAGE_NAMES = new Set([
  'background.png',
  'background.jpg',
  'background.jpeg',
  'background.webp',
]);
const OPTIONAL_FILES = new Set(['LICENSE.txt', 'CREDITS.txt']);
function reject(message) {
  throw new Error(message);
}
function text(value, max) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= max &&
    !/[\x00-\x1f\x7f]/.test(value)
  );
}
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validColor(value) {
  if (typeof value !== 'string' || value.length > 160 || /[;{}<>\\\\\x00-\x1f\x7f]/.test(value))
    return false;
  const parsed = colorString.get(value.trim().toLowerCase());
  return parsed !== null && parsed.value.every(Number.isFinite);
}
function bounded(value, low, high) {
  return typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
}

async function archive(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 32 * MIB) reject('Package exceeds 32 MiB.');
  return new Promise((resolve, rejectPromise) => {
    yauzl.fromBuffer(
      bytes,
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true },
      (error, zip) => {
        if (error) return rejectPromise(new Error('The upload is not a readable ZIP archive.'));
        const files = new Map(),
          names = new Set();
        let total = 0,
          count = 0,
          settled = false;
        const fail = (error) => {
          if (settled) return;
          settled = true;
          zip.close();
          rejectPromise(error);
        };
        zip.on('error', fail);
        zip.on('end', () => {
          if (!settled) {
            settled = true;
            zip.close();
            resolve(files);
          }
        });
        zip.on('entry', async (entry) => {
          try {
            if (++count > 12) reject('Too many archive entries.');
            const name = entry.fileName,
              directory = name.endsWith('/');
            const segments = (directory ? name.slice(0, -1) : name).split('/');
            if (
              !name ||
              name.length > 160 ||
              /[\\:\x00-\x1f\x7f]/.test(name) ||
              segments.some(
                (part) => !part || part === '.' || part === '..' || part !== part.trim(),
              ) ||
              segments.length > 2
            )
              reject('Unsafe archive path.');
            if (names.has(name.toLowerCase())) reject('Duplicate archive path.');
            names.add(name.toLowerCase());
            const kind = (entry.externalFileAttributes >>> 16) & 0o170000;
            if (kind && kind !== (directory ? 0o040000 : 0o100000))
              reject('Only ordinary files and folders are allowed.');
            if (entry.generalPurposeBitFlag & 65 || ![0, 8].includes(entry.compressionMethod))
              reject('Encrypted or unsupported archive entry.');
            if (directory) {
              if (segments.length !== 1 || entry.uncompressedSize)
                reject('Invalid package folder.');
              zip.readEntry();
              return;
            }
            const leaf = segments.at(-1);
            const limit = IMAGE_NAMES.has(leaf)
              ? 10 * MIB
              : leaf === 'theme.json'
                ? 65536
                : OPTIONAL_FILES.has(leaf)
                  ? 32768
                  : 0;
            if (!limit)
              reject(
                'Packages may contain only theme.json, a background image and optional text credits/licenses.',
              );
            total += entry.uncompressedSize;
            if (
              entry.uncompressedSize > limit ||
              total > 11 * MIB ||
              (entry.uncompressedSize > MIB &&
                entry.uncompressedSize > Math.max(1, entry.compressedSize) * 200)
            )
              reject('Archive expansion exceeds the limit.');
            const stream = await new Promise((resolveStream, rejectStream) =>
              zip.openReadStream(entry, (error, stream) =>
                error ? rejectStream(error) : resolveStream(stream),
              ),
            );
            const chunks = [];
            let length = 0;
            for await (const chunk of stream) {
              length += chunk.length;
              if (length > limit) {
                stream.destroy();
                reject('Entry exceeds its size limit.');
              }
              chunks.push(chunk);
            }
            const content = Buffer.concat(chunks, length);
            if (length !== entry.uncompressedSize || crc32(content) !== entry.crc32)
              reject('Archive checksum or size is invalid.');
            files.set(name, content);
            zip.readEntry();
          } catch (error) {
            fail(error);
          }
        });
        zip.readEntry();
      },
    );
  });
}

function manifest(value) {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !text(value.id, 64) ||
    !/^[a-z0-9][a-z0-9.-]*$/.test(value.id) ||
    !text(value.name, 80) ||
    !IMAGE_NAMES.has(value.image)
  )
    reject('Invalid codexskin theme.json metadata.');
  const fields = new Set([
    'schemaVersion',
    'id',
    'name',
    'image',
    'colors',
    'settings',
    'art',
    'appearance',
    'copy',
  ]);
  if (Object.keys(value).some((key) => !fields.has(key)))
    reject('Unsupported theme metadata field.');
  if (value.appearance !== undefined && !['auto', 'light', 'dark'].includes(value.appearance))
    reject('Invalid appearance.');
  if (value.colors !== undefined) {
    if (!object(value.colors)) reject('Colors must be an object.');
    const palette = new Set([
      'background',
      'panel',
      'accent',
      'text',
      'muted',
      'line',
      'panelAlt',
      'accentAlt',
      'secondary',
      'highlight',
    ]);
    for (const [key, color] of Object.entries(value.colors)) {
      if (!palette.has(key)) reject(`Unsupported palette field: colors.${key}.`);
      if (color !== null && !validColor(color))
        reject(`Invalid colors.${key}: use a color name, hex, RGB, HSL or HWB value.`);
    }
  }
  if (value.art !== undefined) {
    if (!object(value.art)) reject('Art settings must be an object.');
    for (const [key, item] of Object.entries(value.art)) {
      const valid = ['focusX', 'focusY'].includes(key)
        ? bounded(item, 0, 1)
        : ['dim', 'taskDim'].includes(key)
          ? bounded(item, 0, 0.95)
          : key === 'blur'
            ? bounded(item, 0, 40)
            : key === 'safeArea'
              ? ['left', 'right', 'none'].includes(item)
              : key === 'taskMode' && ['ambient', 'full', 'off'].includes(item);
      if (!valid) reject('Invalid art setting.');
    }
  }
  if (value.settings !== undefined) {
    if (!object(value.settings)) reject('Settings must be an object.');
    const percentages = new Set([
      'imageX',
      'imageY',
      'sidebarOpacity',
      'sidebarDarkness',
      'chatOpacity',
      'userMessageDarkness',
      'assistantMessageDarkness',
      'activityDarkness',
      'pageOpacity',
      'dialogOpacity',
    ]);
    const colors = new Set([
      'accent',
      'sidebarColor',
      'chatColor',
      'primaryTextColor',
      'secondaryTextColor',
    ]);
    for (const [key, item] of Object.entries(value.settings)) {
      const valid = percentages.has(key)
        ? bounded(item, 0, 100)
        : colors.has(key)
          ? typeof item === 'string' && /^#[a-f\d]{6}$/i.test(item)
          : key === 'brightness'
            ? bounded(item, 20, 180)
            : key === 'imageZoom'
              ? bounded(item, 100, 250)
              : key === 'imageMode'
                ? ['fit', 'fill'].includes(item)
                : key === 'textColorsEnabled' && typeof item === 'boolean';
      if (!valid) reject('Invalid or unsupported theme setting.');
    }
  }
  if (
    value.copy !== undefined &&
    (!object(value.copy) ||
      Object.entries(value.copy).some(
        ([key, item]) =>
          !/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key) || (item !== null && !text(item, 160)),
      ))
  )
    reject('Invalid theme text.');
  return value;
}

async function packageContents(bytes) {
  const entries = await archive(bytes);
  if (!entries.size) reject('Package is empty.');
  const paths = [...entries.keys()],
    nested = paths[0].includes('/'),
    folder = nested ? paths[0].split('/')[0] + '/' : '';
  if (
    paths.some((name) =>
      nested
        ? !name.startsWith(folder) || name.slice(folder.length).includes('/')
        : name.includes('/'),
    )
  )
    reject('Keep all files together at the ZIP root or in one folder.');
  const files = new Map(
    [...entries].map(([name, content]) => [name.slice(folder.length), content]),
  );
  let theme;
  try {
    theme = manifest(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          files.get('theme.json') || Buffer.alloc(0),
        ),
      ),
    );
  } catch (error) {
    reject('theme.json: ' + error.message);
  }
  if (
    !files.has(theme.image) ||
    [...files.keys()].some(
      (name) => name !== 'theme.json' && name !== theme.image && !OPTIONAL_FILES.has(name),
    )
  )
    reject('Package image is missing or an extra image is present.');
  return { theme, image: files.get(theme.image) };
}

export async function readThemeManifest(bytes) {
  return (await packageContents(bytes)).theme;
}

export async function importThemePackage(bytes) {
  const { theme, image } = await packageContents(bytes);
  try {
    const decoder = sharp(image, { limitInputPixels: 40000000, failOn: 'warning' });
    const info = await decoder.metadata(),
      expected = theme.image.endsWith('.png')
        ? 'png'
        : theme.image.endsWith('.webp')
          ? 'webp'
          : 'jpeg';
    if (
      info.format !== expected ||
      !info.width ||
      !info.height ||
      info.width > 8192 ||
      info.height > 8192 ||
      (info.pages || 1) !== 1
    )
      reject('Use a single PNG, JPEG or WebP image within 8192 pixels per side.');
    const preview = await decoder
      .rotate()
      .resize({ width: 1200, height: 750, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    if (preview.length > 3 * MIB) reject('Preview is too large.');
    return { theme, preview };
  } catch (error) {
    reject('Invalid background image: ' + error.message);
  }
}
