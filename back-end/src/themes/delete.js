import { fail } from "../auth/security.js";
import { removeObject } from "../storage/objects.js";

export async function deleteOwnedTheme(
  database,
  theme,
  userId,
  remove = removeObject,
) {
  if (theme.authorId !== userId)
    fail(403, "Only the uploader can delete this theme.");
  for (const key of [theme.packagePath, theme.previewPath]) {
    try {
      await remove(key);
    } catch (error) {
      if (error.status !== 404 && error.code !== "ENOENT") throw error;
    }
  }
  await database.$transaction(async (transaction) => {
    await transaction.upload.deleteMany({ where: { themeId: theme.id } });
    await transaction.theme.deleteMany({
      where: { id: theme.id, authorId: userId },
    });
  });
}
