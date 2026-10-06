export function reportResponse(value) {
  if (!value || !Array.isArray(value.reports))
    throw new Error("Reports could not be loaded. Please retry.");
  const stats = value.stats;
  const complete =
    stats &&
    Number.isInteger(stats.open) &&
    stats.open >= 0 &&
    Number.isInteger(stats.closed) &&
    stats.closed >= 0;
  return {
    reports: value.reports,
    summary: complete
      ? {
          ...value,
          daily: Array.isArray(value.daily)
            ? value.daily.filter(
                (day) =>
                  typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day),
              )
            : [],
        }
      : null,
  };
}
