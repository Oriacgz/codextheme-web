export function dragIntent(dx, dy, pointerType) {
  if (Math.hypot(dx, dy) < 8) return "pending";
  return pointerType === "touch" && Math.abs(dy) >= Math.abs(dx)
    ? "scroll"
    : "drag";
}
export function dragPose(dx, dy) {
  return {
    x: Math.max(-12, Math.min(12, dx)),
    y: Math.max(-8, Math.min(8, dy)),
    angle: Math.max(-10, Math.min(10, dx / 3)),
  };
}
