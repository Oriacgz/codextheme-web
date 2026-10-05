import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const { databaseUrl } = await import("../src/config/environment.js");
if (!["localhost", "127.0.0.1"].includes(new URL(databaseUrl()).hostname))
  throw new Error("Smoke checks require a local database.");
if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL)
  throw new Error(
    "Smoke checks require local filesystem storage, not cloud services.",
  );
const { default: handler } = await import("../src/http/handler.js");
const { db } = await import("../src/db/client.js");
const { removeObject } = await import("../src/storage/objects.js");
const { packageFixture } = await import("../test/fixtures/package.js");
const database = db(),
  server = createServer(handler);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
process.env.APP_ORIGIN = origin;
const users = [],
  objects = [];
async function call(
  route,
  method = "GET",
  body,
  account,
  expected = 200,
  foreign = false,
) {
  const response = await fetch(`${origin}/api/community?route=${route}`, {
    method,
    headers: {
      Origin: foreign ? "https://foreign.invalid" : origin,
      ...(account
        ? { Cookie: account.cookie, "X-CSRF-Token": account.csrf }
        : {}),
      ...(body && !Buffer.isBuffer(body)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: body
      ? Buffer.isBuffer(body)
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  const data = response.headers.get("content-type")?.includes("json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, expected, JSON.stringify(data));
  return { data, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
async function signup(name) {
  const result = await call("signup", "POST", {
    name,
    email: `smoke-${randomUUID()}@example.com`,
    password: "Local-Verification-123",
  });
  users.push(result.data.user.id);
  return { ...result.data, cookie: result.cookie };
}
async function upload(account, bytes) {
  const { data } = await call(
    "uploads",
    "POST",
    {
      name: "Smoke theme",
      description: "Local verification fixture only.",
      category: "Nature",
      license: "CC0",
      rights: true,
      extension: "zip",
    },
    account,
    201,
  );
  objects.push(data.pathname);
  await call(`uploads/${data.id}/file`, "POST", bytes, account);
  return data.id;
}
try {
  const author = await signup("Smoke Author"),
    reader = await signup("Smoke Reader");
  await call("admin", "GET", null, reader, 403);
  await call(
    "profile",
    "PATCH",
    { name: "Reader", avatar: 2147483648 },
    reader,
    400,
  );
  await call(
    "profile",
    "PATCH",
    { name: "Reader", avatar: 1800012345, role: "ADMIN" },
    reader,
  );
  const persisted = await database.user.findUnique({
    where: { id: reader.user.id },
  });
  assert.equal(persisted.role, "USER");
  assert.equal(persisted.avatar, 1800012345);
  assert.equal(
    (await call("session", "GET", null, reader)).data.user.avatar,
    1800012345,
  );
  await call("profile", "PATCH", { name: "Reader", avatar: -1 }, reader, 400);
  await call(
    "profile",
    "PATCH",
    { name: "Reader", avatar: 0 },
    reader,
    403,
    true,
  );
  const bytes = await packageFixture(),
    intent = await upload(author, bytes);
  const { data: published } = await call(
    `uploads/${intent}/complete`,
    "POST",
    {},
    author,
  );
  const theme = await database.theme.findUnique({
    where: { id: published.id },
  });
  objects.push(theme.previewPath);
  assert.equal(theme.status, "PUBLISHED");
  assert.deepEqual(theme.categories, ["Nature"]);
  const edit = {
    name: "Edited smoke theme",
    description: "Edited description and artwork credits.",
    categories: ["Dark", "Nature"],
    license: "CC0",
    rights: true,
    authorId: reader.user.id,
    status: "HIDDEN",
  };
  await call(`themes/${theme.id}`, "PATCH", edit, reader, 403);
  await call(
    `themes/${theme.id}`,
    "PATCH",
    edit,
    { ...author, csrf: "invalid" },
    403,
  );
  await call(
    `themes/${theme.id}`,
    "PATCH",
    { ...edit, categories: [] },
    author,
    400,
  );
  const updated = (await call(`themes/${theme.id}`, "PATCH", edit, author)).data
    .theme;
  assert.deepEqual(updated.categories, ["Dark", "Nature"]);
  assert.equal(updated.name, edit.name);
  const persistedTheme = await database.theme.findUnique({
    where: { id: theme.id },
  });
  assert.equal(persistedTheme.authorId, theme.authorId);
  assert.equal(persistedTheme.status, "PUBLISHED");
  assert.equal(persistedTheme.packagePath, theme.packagePath);
  assert.equal(persistedTheme.fingerprint, theme.fingerprint);
  assert.ok(
    (await call("themes&category=Nature")).data.themes.some(
      (item) => item.id === theme.id,
    ),
  );
  assert.ok(
    (await call("themes&category=Dark")).data.themes.some(
      (item) => item.id === theme.id,
    ),
  );
  await call(`themes/${theme.id}/preview`, "GET", null, reader);
  const image = await fetch(
    `${origin}/api/community?route=themes/${theme.id}/image`,
  );
  assert.equal(image.status, 200);
  const cached = await fetch(
    `${origin}/api/community?route=themes/${theme.id}/image`,
    {
      headers: { "If-None-Match": image.headers.get("etag") },
    },
  );
  assert.equal(cached.status, 304);
  assert.equal((await call(`themes/${theme.id}/image`)).data[0], 255);
  assert.deepEqual((await call(`themes/${theme.id}/download`)).data, bytes);
  assert.deepEqual(
    (await call(`themes/${theme.id}/vote`, "POST", { value: 1 }, reader)).data,
    {
      vote: 1,
      likes: 1,
      dislikes: 0,
    },
  );
  await call(`themes/${theme.id}/vote`, "POST", { value: -1 }, reader);
  assert.equal(await database.vote.count({ where: { themeId: theme.id } }), 1);
  await call(
    `themes/${theme.id}/comments`,
    "POST",
    { body: "<script>plain text</script>" },
    reader,
    201,
  );
  await call(
    `themes/${theme.id}`,
    "PATCH",
    {
      name: "Preserved smoke theme",
      description: "Updated after feedback without losing it.",
      categories: ["Nature", "Minimal"],
      license: "CC0",
      rights: true,
    },
    author,
  );
  assert.equal(await database.vote.count({ where: { themeId: theme.id } }), 1);
  assert.equal(
    await database.comment.count({ where: { themeId: theme.id } }),
    1,
  );
  const comment = await database.comment.findFirst({
    where: { themeId: theme.id },
  });
  await call(`comments/${comment.id}`, "PATCH", { hidden: true }, author, 403);
  const duplicate = await upload(author, bytes);
  await call(`uploads/${duplicate}/complete`, "POST", {}, author, 409);
  const invalid = await upload(author, Buffer.from("invalid zip"));
  await call(`uploads/${invalid}/complete`, "POST", {}, author, 422);
  await database.user.update({
    where: { id: author.user.id },
    data: { role: "ADMIN" },
  });
  await call(`admin/themes/${theme.id}`, "PATCH", { status: "HIDDEN" }, author);
  await call(`themes/${theme.id}`, "GET", null, reader, 404);
  await call(`themes/${theme.id}/preview`, "GET", null, reader, 404);
  await call(`themes/${theme.id}/image`, "GET", null, reader, 404);
  await call(
    `admin/themes/${theme.id}`,
    "PATCH",
    { status: "PUBLISHED" },
    author,
  );
  await call(
    `admin/users/${reader.user.id}`,
    "PATCH",
    { suspended: true },
    author,
  );
  await call("profile", "PATCH", { name: "Reader", avatar: 0 }, reader, 401);
  console.log(
    "Integration smoke passed: accounts, permissions, uploads, previews, downloads, reactions, comments, moderation and suspension.",
  );
} finally {
  await database.upload.deleteMany({ where: { userId: { in: users } } });
  await database.theme.deleteMany({ where: { authorId: { in: users } } });
  await database.user.deleteMany({ where: { id: { in: users } } });
  for (const object of objects) await removeObject(object).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await database.$disconnect();
}
