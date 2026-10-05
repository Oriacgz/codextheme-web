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
