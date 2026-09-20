// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  checkPassword,
  createSession,
  hashPassword,
  parseCookies,
  readSession,
  serializeCookie,
  verifyPassword,
  verifySession,
} from "../src/auth.mjs";

const SECRET = "test-secret";
const NOW = 1_700_000_000_000;

describe("checkPassword", () => {
  it("accepts the matching password and rejects the rest", () => {
    expect(checkPassword("segredo", "segredo")).toBe(true);
    expect(checkPassword("errado", "segredo")).toBe(false);
    expect(checkPassword("", "segredo")).toBe(false);
    expect(checkPassword("segredo", "")).toBe(false);
  });
});

describe("session", () => {
  it("round-trips a valid session", () => {
    const token = createSession(SECRET, { ttlSeconds: 60, now: NOW });
    expect(verifySession(SECRET, token, { now: NOW + 1000 })).toBe(true);
  });

  it("rejects expired or tampered tokens", () => {
    const token = createSession(SECRET, { ttlSeconds: 60, now: NOW });
    expect(verifySession(SECRET, token, { now: NOW + 61_000 })).toBe(false);
    expect(verifySession(SECRET, `${token}x`, { now: NOW })).toBe(false);
    expect(verifySession("other", token, { now: NOW })).toBe(false);
    expect(verifySession(SECRET, undefined, { now: NOW })).toBe(false);
  });
});

describe("user session", () => {
  it("carries the user id through a round-trip", () => {
    const token = createSession(SECRET, {
      ttlSeconds: 60,
      now: NOW,
      userId: "user-42",
    });
    const session = readSession(SECRET, token, { now: NOW + 1000 });
    expect(session).toMatchObject({ userId: "user-42" });
    expect(verifySession(SECRET, token, { now: NOW + 1000 })).toBe(true);
  });

  it("keeps anonymous sessions valid with a null user id", () => {
    const token = createSession(SECRET, { ttlSeconds: 60, now: NOW });
    expect(readSession(SECRET, token, { now: NOW })).toMatchObject({
      userId: null,
    });
  });

  it("rejects tampered, expired and malformed user tokens", () => {
    const token = createSession(SECRET, {
      ttlSeconds: 60,
      now: NOW,
      userId: "user-42",
    });
    expect(readSession(SECRET, token, { now: NOW + 61_000 })).toBeNull();
    expect(readSession(SECRET, `${token}x`, { now: NOW })).toBeNull();
    expect(readSession(SECRET, "a.b.c.d", { now: NOW })).toBeNull();
    expect(readSession(SECRET, undefined, { now: NOW })).toBeNull();
  });
});

describe("password hashing", () => {
  it("round-trips a password and rejects the wrong one", async () => {
    const stored = await hashPassword("segredo");
    expect(stored).toMatch(/^scrypt\$/);
    expect(await verifyPassword("segredo", stored)).toBe(true);
    expect(await verifyPassword("errado", stored)).toBe(false);
  });

  it("salts each hash so equal passwords differ", async () => {
    const first = await hashPassword("segredo");
    const second = await hashPassword("segredo");
    expect(first).not.toBe(second);
    expect(await verifyPassword("segredo", first)).toBe(true);
    expect(await verifyPassword("segredo", second)).toBe(true);
  });

  it("rejects malformed or empty stored hashes", async () => {
    expect(await verifyPassword("segredo", "")).toBe(false);
    expect(await verifyPassword("segredo", "scrypt$onlytwo")).toBe(false);
    expect(await verifyPassword("segredo", undefined)).toBe(false);
  });
});

describe("cookies", () => {
  it("parses a cookie header", () => {
    expect(parseCookies("a=1; mini_session=abc; b=2")).toEqual({
      a: "1",
      mini_session: "abc",
      b: "2",
    });
  });

  it("serializes an httpOnly cookie and honours secure", () => {
    const cookie = serializeCookie("mini_session", "abc", {
      maxAge: 60,
      secure: true,
    });
    expect(cookie).toContain("mini_session=abc");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Max-Age=60");
  });
});
