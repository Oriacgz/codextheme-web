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
export function createShakeTracker(x, time) {
  return {
    lastX: x,
    extreme: x,
    direction: 0,
    reversals: 0,
    travel: 0,
    lastTurn: time,
  };
}
export function trackShake(state, x, time) {
  state.travel += Math.abs(x - state.lastX);
  state.lastX = x;
  const delta = x - state.extreme;
  if (!state.direction) {
    if (Math.abs(delta) >= 16) {
      state.direction = Math.sign(delta);
      state.extreme = x;
    }
  } else if (Math.sign(delta) === state.direction) state.extreme = x;
  else if (Math.abs(delta) >= 16) {
    if (time - state.lastTurn > 650) {
      state.reversals = 0;
      state.travel = Math.abs(delta);
    }
    state.reversals++;
    state.lastTurn = time;
    state.direction *= -1;
    state.extreme = x;
  }
  return state.reversals >= 3 && state.travel >= 120;
}
