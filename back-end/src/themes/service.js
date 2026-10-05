import { randomUUID } from "node:crypto";
import { importThemePackage } from "./package.js";
import { readObject, writeObject, removeObject } from "../storage/objects.js";
import { hash, fail, publicUser } from "../auth/security.js";
export const authorSelect = { id: true, name: true, avatar: true, role: true };
export async function completeUpload(database, upload, user) {
  if (upload.themeId)
    return database.theme.findUnique({ where: { id: upload.themeId } });
  if (upload.expiresAt <= new Date())
    fail(410, "This upload expired. Start a new upload.");
  const bytes = await readObject(upload.pathname),
    fingerprint = hash(bytes);
  let parsed;
  try {
    parsed = await importThemePackage(bytes);
  } catch (error) {
    await removeObject(upload.pathname);
    fail(422, "Theme validation failed: " + error.message);
  }
  const existing = await database.theme.findFirst({
    where: { authorId: user.id, fingerprint },
  });
  if (existing) {
    await removeObject(upload.pathname);
    await database.upload.update({
      where: { id: upload.id },
      data: { expiresAt: new Date() },
    });
    fail(409, "You already uploaded this package.");
  }
  const thumbnail = parsed.preview;
  if (thumbnail.length > 3 * 1024 * 1024)
    fail(413, "Preview is too large. Resize the theme background.");
  const previewPath = `previews/${user.id}/${randomUUID()}-${fingerprint.slice(0, 12)}.jpg`;
  await writeObject(previewPath, thumbnail, "image/jpeg");
  try {
    return await database.$transaction(async (tx) => {
      // Lock the intent: concurrent completion cannot publish the same package twice.
      await tx.$queryRaw`SELECT id FROM "Upload" WHERE id = ${upload.id} FOR UPDATE`;
      const current = await tx.upload.findUnique({ where: { id: upload.id } });
      if (current.themeId) {
        await removeObject(previewPath);
        return tx.theme.findUnique({ where: { id: current.themeId } });
      }
      const theme = await tx.theme.create({
        data: {
          ...upload.metadata,
          categories: upload.metadata.categories?.length
            ? upload.metadata.categories
            : [upload.metadata.category],
          fingerprint,
          packagePath: upload.pathname,
          packageSize: bytes.length,
          previewPath,
          authorId: user.id,
        },
      });
      await tx.upload.update({
        where: { id: upload.id },
        data: { themeId: theme.id },
      });
      return theme;
    });
  } catch (error) {
    await removeObject(previewPath).catch(() => {});
    throw error;
  }
}
export async function decorate(database, themes, viewerId) {
  const ids = themes.map((t) => t.id);
  if (!ids.length) return [];
  const [counts, own] = await Promise.all([
    database.vote.groupBy({
      by: ["themeId", "value"],
      where: { themeId: { in: ids } },
      _count: { _all: true },
    }),
    viewerId
      ? database.vote.findMany({
          where: { userId: viewerId, themeId: { in: ids } },
        })
      : [],
  ]);
  const totals = new Map(ids.map((id) => [id, { likes: 0, dislikes: 0 }]));
  for (const count of counts)
    totals.get(count.themeId)[count.value === 1 ? "likes" : "dislikes"] =
      count._count._all;
  const votes = new Map(own.map((vote) => [vote.themeId, vote.value]));
  return themes.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    categories: t.categories?.length ? t.categories : [t.category],
    license: t.license,
    status: t.status,
    featured: t.featured,
    createdAt: t.createdAt,
    size: t.packageSize,
    author: publicUser(t.author),
    ...totals.get(t.id),
    vote: votes.get(t.id) || 0,
    comments: t._count?.comments || 0,
  }));
}
