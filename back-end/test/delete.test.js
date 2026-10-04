import test from "node:test";
import assert from "node:assert/strict";
import { deleteOwnedTheme } from "../src/themes/delete.js";

test("theme deletion rejects another user before touching files or records", async () => {
  await assert.rejects(
    deleteOwnedTheme({}, { authorId: "owner" }, "other", () =>
      assert.fail("storage called"),
    ),
    { status: 403 },
  );
});
test("owner deletion tolerates missing files and deletes upload references before the theme", async () => {
  const calls = [];
  const database = {
    $transaction: async (fn) =>
      fn({
        upload: { deleteMany: async () => calls.push("upload") },
        theme: {
          deleteMany: async (query) => {
            assert.equal(query.where.authorId, "owner");
            calls.push("theme");
          },
        },
      }),
  };
  await deleteOwnedTheme(
    database,
    {
      id: "theme",
      authorId: "owner",
      packagePath: "zip",
      previewPath: "image",
    },
    "owner",
    async (key) => {
      calls.push(key);
      throw Object.assign(new Error("missing"), { status: 404 });
    },
  );
  assert.deepEqual(calls, ["zip", "image", "upload", "theme"]);
});
test("storage failure retains database records so deletion can be retried", async () => {
  await assert.rejects(
    deleteOwnedTheme(
      { $transaction: () => assert.fail("records deleted") },
      { authorId: "owner", packagePath: "zip" },
      "owner",
      async () => {
        throw new Error("offline");
      },
    ),
    /offline/,
  );
});
