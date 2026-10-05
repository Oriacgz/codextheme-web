import test from "node:test";
import assert from "node:assert/strict";
import { scrollGeometry } from "../../front-end/src/services/scroll.js";

test("floating scrollbar hides for short pages and stays within the track", () => {
  assert.deepEqual(scrollGeometry(800, 600, 400, 0), {
    maximum: 0,
    thumb: 400,
    travel: 0,
    offset: 0,
    progress: 0,
  });
  const bottom = scrollGeometry(800, 4000, 400, 3200);
  assert.equal(bottom.offset + bottom.thumb, 400);
  assert.equal(bottom.progress, 1);
  assert.equal(scrollGeometry(800, 4000, 400, -10).progress, 0);
  assert.equal(scrollGeometry(800, 4000, 400, 5000).progress, 1);
});
test("long pages retain a usable thumb and proportional drag distance", () => {
  const size = scrollGeometry(800, 100000, 400, 49600);
  assert.equal(size.thumb, 40);
  assert.equal(size.progress, 0.5);
  assert.equal(size.offset, size.travel / 2);
});
