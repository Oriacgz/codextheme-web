export async function reportDashboard(database, resolved) {
  const [reports, open, closed, recent] = await Promise.all([
    database.themeReport.findMany({
      where: { resolved },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    database.themeReport.count({ where: { resolved: false } }),
    database.themeReport.count({ where: { resolved: true } }),
    database.themeReport.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      select: { createdAt: true },
      take: 10000,
    }),
  ]);
  const [users, themes] = await Promise.all([
    database.user.findMany({
      where: { id: { in: reports.map((r) => r.userId) } },
      select: { id: true, name: true },
    }),
    database.theme.findMany({
      where: { id: { in: reports.map((r) => r.themeId) } },
      select: { id: true, name: true },
    }),
  ]);
  const memberNames = new Map(users.map((u) => [u.id, u.name]));
  const themeNames = new Map(themes.map((t) => [t.id, t.name]));
  return {
    reports: reports.map((r) => ({
      ...r,
      reporter: memberNames.get(r.userId) || "Deleted member",
      themeName: themeNames.get(r.themeId) || "Deleted theme",
    })),
    stats: { open, closed },
    daily: recent.map((r) => r.createdAt.toISOString().slice(0, 10)),
    limited: recent.length === 10000,
  };
}
export async function readableAudit(database) {
  const entries = await database.adminAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const users = await database.user.findMany({
    where: {
      id: {
        in: [
          ...new Set(
            entries.flatMap((e) => [e.actorId, e.targetId]).filter(Boolean),
          ),
        ],
      },
    },
    select: { id: true, name: true },
  });
  const names = new Map(users.map((u) => [u.id, u.name]));
  return entries.map((e) => ({
    ...e,
    actorName: names.get(e.actorId) || "Former administrator",
    targetName:
      names.get(e.targetId) ||
      (e.action.startsWith("report-") ? "Community report" : "Former account"),
  }));
}
