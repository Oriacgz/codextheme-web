import { randomBytes } from "node:crypto";
import {
  credentials,
  fail,
  passwordHash,
  passwordMatches,
  publicUser,
  rateLimit,
} from "../auth/security.js";

export async function changeAdminPassword(database, user, input) {
  await rateLimit(database, `admin-password:${user.id}`, 10);
  if (
    typeof input.currentPassword !== "string" ||
    !(await passwordMatches(input.currentPassword, user.passwordHash))
  )
    fail(403, "Current password is incorrect.");
  const { password } = credentials({
    email: user.email,
    password: input.password,
  });
  if (password === input.currentPassword)
    fail(400, "Choose a different password.");
  const encoded = await passwordHash(password);
  await database.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: encoded, mustChangePassword: false },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.adminAudit.create({
      data: {
        actorId: user.id,
        targetId: user.id,
        action: "password-changed",
        reason: "Administrator password replaced",
      },
    });
  });
  return { ok: true, signInAgain: true };
}

export async function manageAdministrator(
  database,
  actor,
  method,
  targetId,
  input,
) {
  await rateLimit(database, `admin-access:${actor.id}`, 15);
  if (
    typeof input.currentPassword !== "string" ||
    !(await passwordMatches(input.currentPassword, actor.passwordHash))
  )
    fail(403, "Confirm your current password.");
  if (targetId === actor.id)
    fail(400, "Use another administrator to change your own access.");
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300)
    fail(400, "Provide a reason between 3 and 300 characters.");
  let account, password;
  if (method === "POST") {
    password = randomBytes(24).toString("base64url");
    account = credentials(
      { email: input.email, name: input.name, password },
      true,
    );
    account.passwordHash = await passwordHash(password);
  }
  return database.$transaction(async (tx) => {
    // Serialize all administrator membership changes, including suspension.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(607061)`;
    const currentActor = await tx.user.findUnique({ where: { id: actor.id } });
    if (
      !currentActor ||
      currentActor.suspended ||
      currentActor.role !== "ADMIN" ||
      currentActor.mustChangePassword ||
      currentActor.passwordHash !== actor.passwordHash
    )
      fail(403, "Admin access required.");
    let result;
    if (method === "POST") {
      result = await tx.user.create({
        data: {
          email: account.email,
          name: account.name,
          passwordHash: account.passwordHash,
          role: "ADMIN",
          mustChangePassword: true,
        },
      });
    } else {
      const target = await tx.user.findUnique({ where: { id: targetId } });
      if (!target) fail(404, "Account not found.");
      if (
        target.role === "ADMIN" &&
        !target.suspended &&
        (method === "DELETE" ||
          input.role === "USER" ||
          input.suspended === true)
      ) {
        if (
          (await tx.user.count({
            where: { role: "ADMIN", suspended: false },
          })) <= 1
        )
          fail(409, "Keep at least one active administrator.");
      }
      if (method === "DELETE") {
        if (target.role !== "ADMIN")
          fail(400, "This action only removes administrator accounts.");
        if (
          (await tx.theme.count({ where: { authorId: targetId } })) ||
          (await tx.upload.count({ where: { userId: targetId } }))
        )
          fail(
            409,
            "Remove owned themes and upload records before deleting this account.",
          );
        await tx.user.delete({ where: { id: targetId } });
      } else {
        const data = {};
        if (["USER", "ADMIN"].includes(input.role)) data.role = input.role;
        if (typeof input.suspended === "boolean")
          data.suspended = input.suspended;
        if (!Object.keys(data).length) fail(400, "Invalid account change.");
        result = await tx.user.update({ where: { id: targetId }, data });
        await tx.session.deleteMany({ where: { userId: targetId } });
      }
    }
    await tx.adminAudit.create({
      data: {
        actorId: actor.id,
        targetId: result?.id || targetId,
        action:
          method === "POST"
            ? "admin-created"
            : method === "DELETE"
              ? "admin-deleted"
              : "account-access-changed",
        reason,
      },
    });
    return {
      ok: true,
      ...(result && { user: publicUser(result) }),
      ...(password && { temporaryPassword: password }),
    };
  });
}
