import test from "node:test";
import assert from "node:assert/strict";
import { recordActivity } from "../src/themes/activity.js";
test("activity rejects untrusted visitor IDs and excludes administrators", async () => {
  let touched = false;
  const database = {
    $transaction() {
      touched = true;
      throw Error("unexpected database use");
    },
  };
  await recordActivity(database, { kind: "view", visitor: "bad" });
  await recordActivity(database, {
    kind: "view",
    visitor: "a".repeat(32),
    admin: true,
  });
  await recordActivity(database, { kind: "unknown", visitor: "a".repeat(32) });
  assert.equal(touched, false);
});
test("activity increments only when the deduplication insert succeeds", async () => {
  let count = 0,
    insert = 1;
  const database = {
    $transaction: (fn) =>
      fn({
        activitySeen: { createMany: async () => ({ count: insert }) },
        activityDaily: {
          upsert: async () => {
            count++;
          },
        },
      }),
  };
  await recordActivity(database, {
    kind: "view",
    visitor: "a".repeat(32),
    themeId: "theme",
  });
  insert = 0;
  await recordActivity(database, {
    kind: "view",
    visitor: "a".repeat(32),
    themeId: "theme",
  });
  assert.equal(count, 1);
});
