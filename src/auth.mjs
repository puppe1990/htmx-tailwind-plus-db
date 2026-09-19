import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "mini_session";
export const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

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

export function createSession(
  secret,
  { ttlSeconds = DEFAULT_TTL_SECONDS, now = Date.now() } = {},
) {
  const expiresAt = now + ttlSeconds * 1000;
  return `${expiresAt}.${sign(secret, String(expiresAt))}`;
}

export function verifySession(secret, token, { now = Date.now() } = {}) {
  if (!token) return false;
  const [expiresRaw, signature] = String(token).split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (!safeEqual(signature, sign(secret, String(expiresAt)))) return false;
  return expiresAt > now;
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
