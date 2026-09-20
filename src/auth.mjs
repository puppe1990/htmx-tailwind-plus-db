import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

export const SESSION_COOKIE = "mini_session";
export const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

const deriveKey = promisify(scrypt);
const KEY_LENGTH = 64;
const HASH_SCHEME = "scrypt";

function sign(secret, value) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function checkPassword(provided, expected) {
  if (!provided || !expected) return false;
  return safeEqual(provided, expected);
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(String(password), salt, KEY_LENGTH);
  return `${HASH_SCHEME}$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored ?? "").split("$");
  if (scheme !== HASH_SCHEME || !salt || !hash) return false;
  const key = await deriveKey(String(password), salt, KEY_LENGTH);
  return safeEqual(key.toString("hex"), hash);
}

function sessionPayload({ expiresAt, userId }) {
  return userId == null ? String(expiresAt) : `${userId}.${expiresAt}`;
}

export function createSession(
  secret,
  { ttlSeconds = DEFAULT_TTL_SECONDS, now = Date.now(), userId } = {},
) {
  const expiresAt = now + ttlSeconds * 1000;
  const payload = sessionPayload({ expiresAt, userId });
  return `${payload}.${sign(secret, payload)}`;
}

function parseSession(secret, token, now) {
  if (!token) return null;
  const segments = String(token).split(".");
  if (segments.length < 2 || segments.length > 3) return null;
  const signature = segments.pop();
  const expiresAt = Number(segments[segments.length - 1]);
  if (!Number.isFinite(expiresAt)) return null;
  if (!safeEqual(signature, sign(secret, segments.join(".")))) return null;
  if (expiresAt <= now) return null;
  return { userId: segments.length === 2 ? segments[0] : null, expiresAt };
}

export function verifySession(secret, token, { now = Date.now() } = {}) {
  return parseSession(secret, token, now) !== null;
}

export function readSession(secret, token, { now = Date.now() } = {}) {
  return parseSession(secret, token, now);
}

export function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of String(header).split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

export function serializeCookie(
  name,
  value,
  { maxAge, httpOnly = true, sameSite = "Lax", secure = false } = {},
) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/"];
  if (httpOnly) parts.push("HttpOnly");
  if (sameSite) parts.push(`SameSite=${sameSite}`);
  if (secure) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}
