import { isProduction } from "../config/environment.js";
import {
  randomBytes,
  createHash,
  createHmac,
  scrypt as rawScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(rawScrypt);
const devSecret = randomBytes(32).toString("hex");
export const SESSION_DAYS = 7;
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export function secret() {
  if (isProduction() && (process.env.SESSION_SECRET?.length || 0) < 32)
    fail(503, "Account security is not configured.");
  return process.env.SESSION_SECRET || devSecret;
}
export function csrfFor(token) {
  return createHmac("sha256", secret())
    .update("csrf:" + token)
    .digest("hex");
}
export function equal(a, b) {
  const x = Buffer.from(String(a)),
    y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(password, encoded) {
  const [, salt, stored] = String(encoded).split(":");
  if (!salt || !stored || !/^[a-f0-9]{128}$/.test(stored)) return false;
  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return equal(key.toString("hex"), stored);
}
export const publicUser = (user) =>
  user && {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
  };
export const cookieName = () =>
  isProduction() ? "__Host-community_session" : "community_session";
export function sessionToken(req) {
  const token = String(req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(cookieName() + "="))
    ?.split("=")[1];
  return /^[a-f0-9]{64}$/.test(token || "") ? token : null;
}
export function setCookie(res, token, days = SESSION_DAYS) {
  res.setHeader(
    "Set-Cookie",
    `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${days * 86400}${isProduction() ? "; Secure" : ""}`,
  );
}
export function checkOrigin(req) {
  const expected =
    process.env.APP_ORIGIN || (!isProduction() && `http://${req.headers.host}`);
  if (!expected || req.headers.origin !== expected)
    fail(403, "Request origin not allowed.");
}
export async function readBody(req, limit = 64 * 1024) {
  if (Number(req.headers["content-length"]) > limit)
    fail(413, "Upload exceeds the size limit.");
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) fail(413, "Upload exceeds the size limit.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}
export async function jsonBody(req) {
  // Vercel may have already parsed JSON. Cap that path too.
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    if (Buffer.byteLength(JSON.stringify(req.body)) > 65536)
      fail(413, "Request too large.");
    if (Array.isArray(req.body)) fail(400, "Send a JSON object.");
    return req.body;
  }
  try {
    const value = JSON.parse((await readBody(req)).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "Send a JSON object.");
    return value;
  } catch (error) {
    if (error.status) throw error;
    fail(400, "Invalid JSON request.");
  }
}
export function credentials(input, signup = false) {
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  const password = input.password;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail(400, "Enter a valid email address.");
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  )
    fail(400, "Use a password between 12 and 128 characters.");
  const name = String(input.name || "").trim();
  if (
    signup &&
    (name.length < 2 || name.length > 40 || /[\u0000-\u001f]/.test(name))
  )
    fail(400, "Your name must be 2–40 characters.");
  return { email, password, name };
}
export function themeMetadata(input) {
  const name = String(input.name || "").trim(),
    description = String(input.description || "").trim();
  if (
    name.length < 3 ||
    name.length > 80 ||
    description.length < 10 ||
    description.length > 1200
  )
    fail(400, "Use a 3–80 character name and a 10–1200 character description.");
  const allowed = [
    "Dark",
    "Light",
    "Nature",
    "Illustration",
    "Minimal",
    "Anime",
    "Lofi",
    "Game",
    "Cute",
    "Car",
  ];
  const supplied =
    input.categories === undefined ? [input.category] : input.categories;
  if (
    !Array.isArray(supplied) ||
    !supplied.length ||
    supplied.length > allowed.length ||
    supplied.some((value) => !allowed.includes(value))
  )
    fail(400, "Choose one or more valid theme categories.");
  const categories = [...new Set(supplied)];
  if (
    ![
      "CC0",
      "CC BY 4.0",
      "CC BY-NC 4.0",
      "Personal use only",
      "Other — see description",
    ].includes(input.license)
  )
    fail(400, "Choose the artwork usage rights.");
  if (input.rights !== true)
    fail(400, "Confirm you have permission to share all included assets.");
  return {
    name,
    description,
    category: categories[0],
    categories,
    license: input.license,
  };
}
export async function rateLimit(database, key, limit, seconds = 900) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const identifier = hash(secret() + ":" + key + ":" + window);
  const bucket = await database.rateBucket.upsert({
    where: { key: identifier },
    create: {
      key: identifier,
      count: 1,
      expiresAt: new Date((window + 2) * seconds * 1000),
    },
    update: { count: { increment: 1 } },
  });
  if (bucket.count > limit)
    fail(429, "Too many requests. Please try again later.");
}
