export function scrollGeometry(viewport, content, track, scroll) {
  const maximum = Math.max(0, content - viewport);
  const thumb = Math.min(
    track,
    Math.max(40, (track * viewport) / Math.max(content, 1)),
  );
  const progress = maximum ? Math.min(1, Math.max(0, scroll / maximum)) : 0;
  return {
    maximum,
    thumb,
    travel: track - thumb,
    offset: progress * (track - thumb),
    progress,
  };
}
