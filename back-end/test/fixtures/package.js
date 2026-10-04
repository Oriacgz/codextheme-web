import sharp from 'sharp';
import yazl from 'yazl';
export async function zipFixture(files, options = {}) {
  const zip = new yazl.ZipFile(),
    chunks = [];
  const output = new Promise((resolve, reject) => {
    zip.outputStream.on('data', (chunk) => chunks.push(chunk));
    zip.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on('error', reject);
  });
  for (const [name, bytes] of files) zip.addBuffer(bytes, name, options);
  zip.end();
  return output;
}
export async function themeFiles() {
  const image = await sharp({
    create: { width: 64, height: 40, channels: 3, background: '#d2debd' },
  })
    .png()
    .toBuffer();
  const theme = {
    schemaVersion: 1,
    id: 'community-test',
    name: 'Community Test',
    image: 'background.png',
    colors: { accent: '#8ac090' },
    settings: { sidebarOpacity: 50, pageOpacity: 32 },
  };
  return new Map([
    ['theme.json', Buffer.from(JSON.stringify(theme))],
    ['background.png', image],
  ]);
}
export async function packageFixture() {
  return zipFixture(await themeFiles());
}
