import { createHmac } from "node:crypto";
import { secret } from "../auth/security.js";
export async function recordActivity(
  database,
  { kind, themeId = "app", visitor, admin = false },
) {
  if (
    admin ||
    !["view", "download", "app-download"].includes(kind) ||
    !/^[a-f0-9]{32}$/.test(visitor || "")
  )
    return;
  const day = new Date().toISOString().slice(0, 10);
  const key = createHmac("sha256", secret())
    .update(`${day}:${kind}:${themeId}:${visitor}`)
    .digest("hex");
  await database.$transaction(async (tx) => {
    const inserted = await tx.activitySeen.createMany({
      data: [{ key, expiresAt: new Date(Date.now() + 2 * 86400000) }],
      skipDuplicates: true,
    });
    if (!inserted.count) return;
    await tx.activityDaily.upsert({
      where: { day_themeId_kind: { day, themeId, kind } },
      create: { day, themeId, kind, count: 1 },
      update: { count: { increment: 1 } },
    });
  });
}
export async function activitySummary(database, days = 30) {
  days = [7, 30, 90].includes(days) ? days : 30;
  const since = new Date(Date.now() - (days - 1) * 86400000)
    .toISOString()
    .slice(0, 10);
  const rows = await database.activityDaily.findMany({
    where: { day: { gte: since } },
    take: 10000,
    orderBy: { day: "asc" },
  });
  const timeline = new Map(),
    themes = new Map();
  for (const row of rows) {
    const day = timeline.get(row.day) || {
      day: row.day,
      views: 0,
      downloads: 0,
      appDownloads: 0,
    };
    day[
      row.kind === "view"
        ? "views"
        : row.kind === "download"
          ? "downloads"
          : "appDownloads"
    ] += row.count;
    timeline.set(row.day, day);
    if (row.themeId !== "app") {
      const t = themes.get(row.themeId) || {
        id: row.themeId,
        views: 0,
        downloads: 0,
      };
      t[row.kind === "view" ? "views" : "downloads"] += row.count;
      themes.set(row.themeId, t);
    }
  }
  const top = [...themes.values()]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const [names, votes] = await Promise.all([
    database.theme.findMany({
      where: { id: { in: top.map((t) => t.id) } },
      select: {
        id: true,
        name: true,
        _count: { select: { comments: { where: { hidden: false } } } },
      },
    }),
    database.vote.groupBy({
      by: ["themeId", "value"],
      where: { themeId: { in: top.map((t) => t.id) } },
      _count: { _all: true },
    }),
  ]);
  const named = new Map(names.map((n) => [n.id, n]));
  const reactions = new Map(
    votes.map((v) => [`${v.themeId}:${v.value}`, v._count._all]),
  );
  return {
    days,
    timezone: "UTC",
    timeline: [...timeline.values()],
    top: top.map((t) => ({
      ...t,
      name: named.get(t.id)?.name || "Deleted theme",
      likes: reactions.get(t.id + ":1") || 0,
      dislikes: reactions.get(t.id + ":-1") || 0,
      comments: named.get(t.id)?._count.comments || 0,
    })),
    limited: rows.length === 10000,
  };
}
