import test from "node:test";
import assert from "node:assert/strict";
import { themeMetadata } from "../src/auth/security.js";
const base = {
  name: "My theme",
  description: "A theme with several categories.",
  license: "CC0",
  rights: true,
};
test("new categories deduplicate and legacy category requests remain compatible", () => {
  assert.deepEqual(
    themeMetadata({ ...base, categories: ["Dark", "Nature", "Dark"] })
      .categories,
    ["Dark", "Nature"],
  );
  assert.equal(
    themeMetadata({ ...base, categories: ["Nature", "Illustration"] }).category,
    "Nature",
  );
  assert.deepEqual(themeMetadata({ ...base, category: "Light" }).categories, [
    "Light",
  ]);
});
test("metadata rejects empty, invalid and malformed categories and excludes protected fields", () => {
  for (const categories of [
    [],
    ["Unknown"],
    null,
    "Dark",
    Array(11).fill("Dark"),
  ])
    assert.throws(() => themeMetadata({ ...base, categories }), {
      status: 400,
    });
  const metadata = themeMetadata({
    ...base,
    categories: ["Dark"],
    authorId: "other",
    status: "PUBLISHED",
    fingerprint: "changed",
  });
  assert.equal("authorId" in metadata, false);
  assert.equal("status" in metadata, false);
  assert.equal("fingerprint" in metadata, false);
});

test("new thematic categories are accepted together", () => {
  const categories = ["Anime", "Lofi", "Game", "Cute", "Car"];
  assert.deepEqual(
    themeMetadata({ ...base, categories }).categories,
    categories,
  );
});
