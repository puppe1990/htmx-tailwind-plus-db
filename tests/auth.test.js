// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  checkPassword,
  createSession,
  parseCookies,
  serializeCookie,
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
