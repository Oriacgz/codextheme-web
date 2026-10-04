import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importThemePackage, readThemeManifest } from '../src/themes/package.js';
import { packageFixture, themeFiles, zipFixture } from './fixtures/package.js';

test('codexskin packages validate and generate a decoded preview', async () => {
  const parsed = await importThemePackage(await packageFixture());
  assert.equal(parsed.theme.name, 'Community Test');
  assert.equal(parsed.preview[0], 255);
  const files = await themeFiles();
  const wrapped = await zipFixture(
    new Map([...files].map(([name, bytes]) => ['MyTheme/' + name, bytes])),
  );
  assert.equal((await importThemePackage(wrapped)).theme.settings.sidebarOpacity, 50);
});
test('invalid archives, paths, checksums, duplicate files and oversized entries are rejected', async () => {
  await assert.rejects(importThemePackage(Buffer.from('renamed zip')));
  const plain = await zipFixture(await themeFiles(), { compress: false });
  const traversing = Buffer.from(plain);
  // Mutate both ZIP header names without relying on a permissive ZIP writer.
  let index = 0;
  while ((index = traversing.indexOf('theme.json', index)) >= 0) {
    traversing.write('../me.json', index);
    index += 10;
  }
  await assert.rejects(importThemePackage(traversing));
  const corrupt = Buffer.from(plain),
    payload = corrupt.indexOf('{"schemaVersion"');
  corrupt[payload] ^= 1;
  await assert.rejects(importThemePackage(corrupt), /checksum/);
  const files = await themeFiles();
  files.set('extra.exe', Buffer.from('no'));
  await assert.rejects(importThemePackage(await zipFixture(files)), /only theme.json/);
  await assert.rejects(
    importThemePackage(
      await zipFixture([...(await themeFiles()), ['theme.json', Buffer.from('{}')]]),
    ),
    /Duplicate/,
  );
  await assert.rejects(
    importThemePackage(await zipFixture([['theme.json', Buffer.alloc(65537)]])),
    /limit/,
  );
});
test('foreign layouts, custom CSS, invalid metadata and disguised images do not publish', async () => {
  const files = await themeFiles();
  files.set('theme.css', Buffer.from('body {color: red}'));
  await assert.rejects(importThemePackage(await zipFixture(files)), /only theme.json/);
  files.delete('theme.css');
  files.set('background.png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
  await assert.rejects(importThemePackage(await zipFixture(files)), /background image/);
  const foreign = new Map([['manifest.json', Buffer.from('{}')]]);
  await assert.rejects(importThemePackage(await zipFixture(foreign)), /only theme.json/);
  const invalid = await themeFiles(),
    theme = JSON.parse(invalid.get('theme.json'));
  theme.settings.sidebarOpacity = 101;
  invalid.set('theme.json', Buffer.from(JSON.stringify(theme)));
  await assert.rejects(importThemePackage(await zipFixture(invalid)), /setting/);
});

test('palette accepts CSS colors and rejects invalid values and CSS injection', async () => {
  const files = await themeFiles(),
    theme = JSON.parse(files.get('theme.json'));
  for (const color of [
    'rebeccapurple',
    'RED',
    'transparent',
    '#abcd',
    '#12345678',
    'rgb(20, 40, 60)',
    'rgb(20 40 60 / 50%)',
    'hsl(120 50% 40%)',
    'hsla(120, 50%, 40%, .5)',
    'hwb(60 3% 60%)',
    null,
  ]) {
    theme.colors = { accent: color };
    files.set('theme.json', Buffer.from(JSON.stringify(theme)));
    assert.equal((await importThemePackage(await zipFixture(files))).theme.colors.accent, color);
  }
  for (const color of [
    'not-a-color',
    'red; background:url(https://example.com)',
    'var(--unknown)',
    '#12',
    123,
    {},
    'rgb(NaN, 0, 0)',
  ]) {
    theme.colors = { accent: color };
    files.set('theme.json', Buffer.from(JSON.stringify(theme)));
    await assert.rejects(importThemePackage(await zipFixture(files)), /Invalid colors.accent/);
  }
});
test('complete desktop export palettes preserve populated and null extra fields', async () => {
  const files = await themeFiles(),
    theme = JSON.parse(files.get('theme.json'));
  theme.colors = {
    background: null,
    panel: 'rgba(16,24,32,0.72)',
    accent: '#b7f0ce',
    text: '#eef4f1',
    muted: null,
    line: null,
    panelAlt: null,
    accentAlt: '#abc',
    secondary: null,
    highlight: 'rgb(20,40,60)',
  };
  files.set('theme.json', Buffer.from(JSON.stringify(theme)));
  assert.deepEqual((await importThemePackage(await zipFixture(files))).theme.colors, theme.colors);
  theme.colors.unknown = null;
  files.set('theme.json', Buffer.from(JSON.stringify(theme)));
  await assert.rejects(
    importThemePackage(await zipFixture(files)),
    /Unsupported palette field: colors.unknown/,
  );
});
test('appearance metadata is available for existing packages without decoding a new preview', async () => {
  const bytes = await packageFixture();
  const manifest = await readThemeManifest(bytes);
  const parsed = await importThemePackage(bytes);
  assert.deepEqual(manifest, parsed.theme);
  assert.equal(manifest.settings.sidebarOpacity, 50);
});
