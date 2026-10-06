import { reportDashboard, readableAudit } from "../auth/dashboard.js";
import { recordActivity, activitySummary } from "../themes/activity.js";
import { latestRelease } from "../themes/releases.js";
import {
  changeAdminPassword,
  manageAdministrator,
} from "../auth/administrators.js";
import { deleteOwnedTheme } from "../themes/delete.js";
import { getThemePreview } from "../themes/preview-cache.js";
import { databaseUrl } from "../config/environment.js";
import { randomUUID } from "node:crypto";
import { handleUpload } from "@vercel/blob/client";
import { db } from "../db/client.js";
import { currentSession, requireUser, signIn } from "../auth/session.js";
import {
  fail,
  hash,
  setCookie,
  secret,
  checkOrigin,
  jsonBody,
  readBody,
  credentials,
  themeMetadata,
  passwordHash,
  passwordMatches,
  publicUser,
  rateLimit,
  equal,
} from "../auth/security.js";
import {
  PACKAGE_LIMIT,
  readObject,
  writeObject,
  packageStream,
} from "../storage/objects.js";
import { authorSelect, completeUpload, decorate } from "../themes/service.js";
const include = {
  author: { select: authorSelect },
  _count: { select: { comments: { where: { hidden: false } } } },
};
const uuid = (value) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
    value || "",
  ) || fail(400, "Invalid item ID.");
const send = (res, value, status = 200) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(value));
};

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  const url = new URL(req.url, "http://community.local"),
    route = url.searchParams.get("route") || "themes";
  const parts = route.split("/"),
    method = req.method;
  try {
    if (route === "session" && !databaseUrl())
      return send(res, { user: null, csrf: null, configured: false });
    if (route === "themes" && !databaseUrl())
      return send(res, { themes: [], configured: false, next: null });
    const database = db();
    secret();
    if (route === "blob-upload" && method === "POST") {
      const body = await jsonBody(req);
      if (body.type === "blob.generate-client-token") checkOrigin(req);
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const { user, csrf } = await requireUser(req, database);
          let payload;
          try {
            payload = JSON.parse(clientPayload);
          } catch {
            fail(400, "Invalid upload request.");
          }
          if (!equal(payload.csrf || "", csrf))
            fail(403, "Refresh and retry your upload.");
          uuid(payload.intentId);
          const intent = await database.upload.findUnique({
            where: { id: payload.intentId },
          });
          if (
            !intent ||
            intent.userId !== user.id ||
            intent.pathname !== pathname ||
            intent.themeId ||
            intent.expiresAt <= new Date()
          )
            fail(403, "Upload permission expired.");
          return {
            allowedContentTypes: [
              "application/zip",
              "application/octet-stream",
            ],
            maximumSizeInBytes: PACKAGE_LIMIT,
            addRandomSuffix: false,
            allowOverwrite: false,
            validUntil: Date.now() + 10 * 60000,
            tokenPayload: JSON.stringify({ id: intent.id }),
          };
        },
        onUploadCompleted: async () => {
          /* Publication happens only after authenticated validation. */
        },
      });
      return send(res, result);
    }
    if (!["GET", "HEAD"].includes(method)) checkOrigin(req);
    if (method === "GET" && route === "app-release")
      return send(res, await latestRelease());
    if (method === "GET" && route === "app-download") {
      const release = await latestRelease();
      await recordActivity(database, {
        kind: "app-download",
        visitor: url.searchParams.get("visitor"),
        admin: (await currentSession(req, database))?.user.role === "ADMIN",
      }).catch(() => {});
      res.writeHead(302, {
        Location: release.url,
        "Cache-Control": "no-store",
      });
      return res.end();
    }
    if (route === "session" && method === "GET") {
      const session = await currentSession(req, database);
      return send(res, {
        user: session
          ? { ...publicUser(session.user), email: session.user.email }
          : null,
        csrf: session?.csrf || null,
        configured: true,
        cloudStorage: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      });
    }
    if (["signup", "login"].includes(route) && method === "POST") {
      const input = credentials(await jsonBody(req), route === "signup");
      const ip = process.env.VERCEL
        ? String(req.headers["x-forwarded-for"] || "").split(",")[0]
        : req.socket.remoteAddress;
      await rateLimit(database, "auth-ip:" + ip, 20);
      await rateLimit(database, "auth-account:" + input.email, 10);
      let user;
      if (route === "signup")
        user = await database.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash: await passwordHash(input.password),
          },
        });
      else {
        user = await database.user.findUnique({
          where: { email: input.email },
        });
        // Missing accounts still perform the same expensive password operation.
        const matches = user
          ? await passwordMatches(input.password, user.passwordHash)
          : (await passwordHash(input.password), false);
        if (!matches || user.suspended)
          fail(401, "Email or password is incorrect.");
      }
      return send(res, await signIn(res, database, user));
    }
    if (route === "logout" && method === "POST") {
      const session = await requireUser(req, database, { write: true });
      await database.session.delete({ where: { hash: hash(session.token) } });
      setCookie(res, "", 0);
      return send(res, { ok: true });
    }
    if (route === "profile" && method === "PATCH") {
      const { user } = await requireUser(req, database, { write: true }),
        input = await jsonBody(req);
      const name = String(input.name || "").trim();
      if (
        name.length < 2 ||
        name.length > 40 ||
        /[\u0000-\u001f]/.test(name) ||
        !Number.isInteger(input.avatar) ||
        input.avatar < 0 ||
        input.avatar > 2147483647
      )
        fail(400, "Choose a valid name and avatar.");
      const updated = await database.user.update({
        where: { id: user.id },
        data: { name, avatar: input.avatar },
      });
      return send(res, {
        user: { ...publicUser(updated), email: updated.email },
      });
    }
    if (route === "themes" && method === "GET") {
      const query = (url.searchParams.get("search") || "").slice(0, 80),
        category = url.searchParams.get("category");
      const mine = url.searchParams.get("mine") === "1";
      const session = await currentSession(req, database);
      if (mine && !session) fail(401, "Sign in to view your uploads.");
      const cursor = url.searchParams.get("cursor");
      if (cursor) uuid(cursor);
      const themes = await database.theme.findMany({
        where: {
          ...(mine
            ? { authorId: session.user.id }
            : { status: "PUBLISHED", author: { suspended: false } }),
          ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
          ...(category && category !== "All"
            ? { OR: [{ categories: { has: category } }, { category }] }
            : {}),
        },
        include,
        take: 25,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      return send(res, {
        themes: await decorate(database, themes.slice(0, 24), session?.user.id),
        next: themes.length > 24 ? themes[23].id : null,
        configured: true,
      });
    }
    if (parts[0] === "themes" && parts[1]) {
      uuid(parts[1]);
      const [session, theme] = await Promise.all([
        currentSession(req, database),
        database.theme.findUnique({ where: { id: parts[1] }, include }),
      ]);
      if (
        !theme ||
        ((theme.status !== "PUBLISHED" || theme.author.suspended) &&
          session?.user.id !== theme.authorId &&
          session?.user.role !== "ADMIN")
      )
        fail(404, "Theme not found.");
      if (method === "PATCH" && !parts[2]) {
        const { user } = await requireUser(req, database, { write: true });
        if (user.id !== theme.authorId)
          fail(403, "Only the uploader can edit this theme.");
        const metadata = themeMetadata(await jsonBody(req));
        await rateLimit(database, "theme-edits:" + user.id, 30);
        const updated = await database.theme.update({
          where: { id: theme.id },
          data: metadata,
          include,
        });
        return send(res, {
          theme: (await decorate(database, [updated], user.id))[0],
        });
      }
      if (method === "DELETE" && !parts[2]) {
        const { user } = await requireUser(req, database, { write: true });
        await deleteOwnedTheme(database, theme, user.id);
        return send(res, { ok: true });
      }
      if (method === "POST" && parts[2] === "report" && parts.length === 3) {
        const { user } = await requireUser(req, database, { write: true });
        const input = await jsonBody(req);
        if (
          typeof input.reason !== "string" ||
          input.reason.trim().length < 10 ||
          input.reason.length > 1000
        )
          fail(400, "Explain the concern in 10–1000 characters.");
        await rateLimit(database, "reports:" + user.id, 10);
        await database.themeReport.upsert({
          where: { userId_themeId: { userId: user.id, themeId: theme.id } },
          create: {
            userId: user.id,
            themeId: theme.id,
            reason: input.reason.trim(),
          },
          update: { reason: input.reason.trim(), resolved: false },
        });
        return send(res, { ok: true });
      }
      if (method === "POST" && parts[2] === "view" && parts.length === 3) {
        const input = await jsonBody(req);
        await rateLimit(database, "views:" + theme.id, 300);
        await recordActivity(database, {
          kind: "view",
          themeId: theme.id,
          visitor: input.visitor,
          admin: session?.user.role === "ADMIN",
        });
        return send(res, { ok: true });
      }
      if (method === "GET" && parts[2] === "preview")
        return send(res, { preview: await getThemePreview(theme) });
      if (method === "GET" && parts[2] === "image") {
        const etag = `"${theme.fingerprint}"`;
        res.setHeader("Cache-Control", "private, no-cache");
        res.setHeader("ETag", etag);
        if (req.headers["if-none-match"] === etag) {
          res.statusCode = 304;
          return res.end();
        }
        const bytes = await readObject(theme.previewPath, 3 * 1024 * 1024);
        res.setHeader("Content-Type", "image/jpeg");
        return res.end(bytes);
      }
      if (method === "GET" && parts[2] === "download") {
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="theme-${theme.id}.zip"`,
        );
        const stream = await packageStream(theme.packagePath);
        await recordActivity(database, {
          kind: "download",
          themeId: theme.id,
          visitor: url.searchParams.get("visitor"),
          admin: session?.user.role === "ADMIN",
        }).catch(() => {});
        stream.on("error", () => res.destroy());
        res.on("close", () => stream.destroy());
        return stream.pipe(res);
      }
      if (method === "GET" && !parts[2]) {
        const [comments, preview, decorated] = await Promise.all([
          database.comment.findMany({
            where: { themeId: theme.id, hidden: false },
            include: { user: { select: authorSelect } },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 50,
          }),
          getThemePreview(theme),
          decorate(database, [theme], session?.user.id),
        ]);
        return send(res, {
          theme: { ...decorated[0], preview },
          comments: comments.map((c) => ({
            id: c.id,
            body: c.body,
            author: publicUser(c.user),
            createdAt: c.createdAt,
          })),
        });
      }
      if (method === "POST" && ["vote", "comments"].includes(parts[2])) {
        const { user } = await requireUser(req, database, { write: true });
        if (theme.status !== "PUBLISHED" || theme.author.suspended)
          fail(409, "This theme is unavailable.");
        const input = await jsonBody(req);
        await rateLimit(
          database,
          parts[2] + ":" + user.id,
          parts[2] === "vote" ? 120 : 20,
        );
        if (parts[2] === "vote") {
          if (![0, 1, -1].includes(input.value)) fail(400, "Invalid vote.");
          if (input.value === 0)
            await database.vote.deleteMany({
              where: { userId: user.id, themeId: theme.id },
            });
          else
            await database.vote.upsert({
              where: { userId_themeId: { userId: user.id, themeId: theme.id } },
              create: {
                userId: user.id,
                themeId: theme.id,
                value: input.value,
              },
              update: { value: input.value },
            });
          const counts = await database.vote.groupBy({
            by: ["value"],
            where: { themeId: theme.id },
            _count: { _all: true },
          });
          return send(res, {
            vote: input.value,
            likes: counts.find((count) => count.value === 1)?._count._all || 0,
            dislikes:
              counts.find((count) => count.value === -1)?._count._all || 0,
          });
        }
        const body = String(input.body || "").trim();
        if (!body || body.length > 1000)
          fail(400, "Write a comment of 1–1000 characters.");
        await database.comment.create({
          data: { body, userId: user.id, themeId: theme.id },
        });
        return send(res, { ok: true }, 201);
      }
    }
    if (parts[0] === "uploads" && method === "POST") {
      const { user } = await requireUser(req, database, { write: true });
      if (parts.length === 1) {
        const input = await jsonBody(req),
          metadata = themeMetadata(input);
        if (!["zip", "codextheme"].includes(input.extension))
          fail(400, "Upload a ZIP or .codextheme package.");
        await rateLimit(database, "uploads:" + user.id, 10, 86400);
        const id = randomUUID(),
          pathname = `incoming/${user.id}/${id}.${input.extension}`;
        const upload = await database.upload.create({
          data: {
            id,
            userId: user.id,
            pathname,
            metadata,
            expiresAt: new Date(Date.now() + 30 * 60000),
          },
        });
        return send(
          res,
          {
            id: upload.id,
            pathname,
            cloudStorage: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
          },
          201,
        );
      }
      uuid(parts[1]);
      const upload = await database.upload.findUnique({
        where: { id: parts[1] },
      });
      if (
        !upload ||
        upload.userId !== user.id ||
        (!upload.themeId && upload.expiresAt <= new Date())
      )
        fail(404, "Upload permission expired.");
      if (parts[2] === "file") {
        if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN)
          fail(400, "Use the direct Blob upload endpoint.");
        if (upload.themeId) fail(409, "Already published.");
        await writeObject(
          upload.pathname,
          await readBody(req, PACKAGE_LIMIT),
          "application/zip",
        );
        return send(res, { ok: true });
      }
      if (parts[2] === "complete") {
        const theme = await completeUpload(database, upload, user);
        return send(res, { id: theme.id });
      }
    }
    if (parts[0] === "comments" && method === "PATCH") {
      uuid(parts[1]);
      const { user } = await requireUser(req, database, { write: true });
      const comment = await database.comment.findUnique({
        where: { id: parts[1] },
      });
      if (!comment || (comment.userId !== user.id && user.role !== "ADMIN"))
        fail(403, "You cannot moderate this comment.");
      const input = await jsonBody(req);
      if (
        typeof input.hidden !== "boolean" ||
        (user.role !== "ADMIN" && !input.hidden)
      )
        fail(400, "Invalid moderation request.");
      await database.comment.update({
        where: { id: comment.id },
        data: { hidden: input.hidden },
      });
      return send(res, { ok: true });
    }
    if (parts[0] === "admin") {
      const { user } = await requireUser(req, database, {
        write: method !== "GET",
        admin: true,
        allowTemporary:
          method === "POST" && parts.length === 2 && parts[1] === "password",
      });
      if (method === "POST" && parts[1] === "password" && parts.length === 2) {
        return send(
          res,
          await changeAdminPassword(database, user, await jsonBody(req)),
        );
      }
      if (user.mustChangePassword)
        fail(
          403,
          "Replace your temporary password before using the dashboard.",
        );
      if (method === "GET" && parts[1] === "analytics")
        return send(
          res,
          await activitySummary(
            database,
            Number(new URL(req.url, "http://local").searchParams.get("days")),
          ),
        );
      if (parts[1] === "reports") {
        if (method === "GET")
          return send(
            res,
            await reportDashboard(
              database,
              url.searchParams.get("resolved") === "1",
            ),
          );
        if (method === "PATCH" && parts.length === 3) {
          uuid(parts[2]);
          const input = await jsonBody(req);
          if (typeof input.resolved !== "boolean")
            fail(400, "Choose a report status.");
          await database.$transaction(async (tx) => {
            await tx.themeReport.update({
              where: { id: parts[2] },
              data: { resolved: input.resolved },
            });
            await tx.adminAudit.create({
              data: {
                actorId: user.id,
                targetId: parts[2],
                action: "report-status-changed",
                reason: input.resolved ? "Report resolved" : "Report reopened",
              },
            });
          });
          return send(res, { ok: true });
        }
      }
      if (parts[1] === "administrators") {
        if (method === "GET" && parts.length === 2) {
          return send(res, {
            users: await database.user.findMany({
              where: { role: "ADMIN" },
              select: {
                ...authorSelect,
                email: true,
                suspended: true,
                mustChangePassword: true,
              },
              orderBy: { createdAt: "asc" },
              take: 100,
            }),
          });
        }
        if (
          (method === "POST" && parts.length === 2) ||
          (["PATCH", "DELETE"].includes(method) && parts.length === 3)
        ) {
          if (parts[2]) uuid(parts[2]);
          return send(
            res,
            await manageAdministrator(
              database,
              user,
              method,
              parts[2],
              await jsonBody(req),
            ),
          );
        }
      }
      if (method === "GET" && parts[1] === "audit" && parts.length === 2) {
        return send(res, {
          entries: await readableAudit(database),
        });
      }
      if (method === "GET" && parts.length === 1) {
        const page = Math.min(
          1000,
          Math.max(
            0,
            Number.parseInt(url.searchParams.get("page") || "0", 10) || 0,
          ),
        );
        const section = url.searchParams.get("section");
        if (
          section &&
          !["stats", "themes", "members", "comments"].includes(section)
        )
          fail(400, "Unknown dashboard section.");
        const totals = !section || section === "stats";
        const search = (url.searchParams.get("search") || "").slice(0, 80);
        const [
          users,
          themes,
          comments,
          published,
          uploads,
          recentUsers,
          recentComments,
        ] = await Promise.all([
          totals ? database.user.count() : 0,
          totals ? database.theme.count() : 0,
          totals ? database.comment.count({ where: { hidden: false } }) : 0,
          totals ? database.theme.count({ where: { status: "PUBLISHED" } }) : 0,
          !section || section === "themes"
            ? database.theme.findMany({
                include,
                where: search
                  ? { name: { contains: search, mode: "insensitive" } }
                  : {},
                skip: page * 50,
                take: 50,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              })
            : [],
          !section || section === "members"
            ? database.user.findMany({
                where: search
                  ? {
                      OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                      ],
                    }
                  : {},
                skip: page * 50,
                select: {
                  ...authorSelect,
                  email: true,
                  suspended: true,
                  createdAt: true,
                },
                take: 50,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              })
            : [],
          !section || section === "comments"
            ? database.comment.findMany({
                where: search
                  ? { body: { contains: search, mode: "insensitive" } }
                  : {},
                skip: page * 50,
                include: {
                  user: { select: authorSelect },
                  theme: { select: { id: true, name: true } },
                },
                take: 50,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              })
            : [],
        ]);
        return send(res, {
          ...(totals && { stats: { users, themes, comments, published } }),
          themes: await decorate(database, uploads, user.id),
          users: recentUsers,
          comments: recentComments.map((c) => ({
            id: c.id,
            body: c.body,
            hidden: c.hidden,
            author: publicUser(c.user),
            theme: c.theme,
          })),
        });
      }
      if (method === "PATCH" && parts[1] === "themes") {
        uuid(parts[2]);
        const input = await jsonBody(req),
          data = {};
        if (typeof input.featured === "boolean") data.featured = input.featured;
        if (["PUBLISHED", "HIDDEN"].includes(input.status))
          data.status = input.status;
        if (!Object.keys(data).length)
          fail(400, "Invalid theme moderation request.");
        await database.theme.update({ where: { id: parts[2] }, data });
        return send(res, { ok: true });
      }
      if (method === "PATCH" && parts[1] === "users") {
        uuid(parts[2]);
        const input = await jsonBody(req);
        if (parts[2] === user.id || typeof input.suspended !== "boolean")
          fail(400, "You cannot suspend your own admin account.");
        await manageAdministrator(database, user, "PATCH", parts[2], input);
        return send(res, { ok: true });
      }
    }
    fail(404, "Page not found.");
  } catch (error) {
    if (res.headersSent) return res.destroy();
    if (error.code === "P2002")
      return send(
        res,
        { error: "That account or upload already exists." },
        409,
      );
    if (error.code === "P2025")
      return send(res, { error: "Item not found." }, 404);
    if (!error.status)
      console.error("Community request failed:", error.code || error.name);
    return send(
      res,
      {
        error: error.status
          ? error.message
          : "Unable to complete the request. Please try again.",
      },
      error.status || 500,
    );
  }
}
