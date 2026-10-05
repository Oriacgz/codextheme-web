import test from "node:test";
import assert from "node:assert/strict";
import {
  dragIntent,
  dragPose,
} from "../../front-end/src/services/avatar-gestures.js";
test("avatar gestures distinguish tapping, mobile scrolling and deliberate dragging", () => {
  assert.equal(dragIntent(3, 4, "mouse"), "pending");
  assert.equal(dragIntent(2, 20, "touch"), "scroll");
  assert.equal(dragIntent(20, 2, "touch"), "drag");
  assert.equal(dragIntent(0, 20, "mouse"), "drag");
});
test("drag poses stay bounded and return to neutral", () => {
  assert.deepEqual(dragPose(100, -100), { x: 12, y: -8, angle: 10 });
  assert.deepEqual(dragPose(-100, 100), { x: -12, y: 8, angle: -10 });
  assert.deepEqual(dragPose(0, 0), { x: 0, y: 0, angle: 0 });
});
import {
  createShakeTracker,
  trackShake,
} from "../../front-end/src/services/avatar-gestures.js";
test("rapid left-right shaking triggers dizziness only after deliberate reversals", () => {
  const state = createShakeTracker(0, 0);
  assert.equal(trackShake(state, 40, 100), false);
  assert.equal(trackShake(state, -40, 200), false);
  assert.equal(trackShake(state, 40, 300), false);
  assert.equal(trackShake(state, -40, 400), true);
});
test("ordinary dragging, slow movement and small jitter do not trigger dizziness", () => {
  const straight = createShakeTracker(0, 0);
  for (let i = 1; i <= 5; i++)
    assert.equal(trackShake(straight, i * 40, i * 100), false);
  const slow = createShakeTracker(0, 0);
  for (let i = 1; i <= 6; i++)
    assert.equal(trackShake(slow, i % 2 ? 40 : -40, i * 1000), false);
  const jitter = createShakeTracker(0, 0);
  for (let i = 1; i <= 30; i++)
    assert.equal(trackShake(jitter, i % 2 ? 3 : -3, i * 10), false);
});
