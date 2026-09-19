// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApi } from "../src/api.mjs";
import { createSession, SESSION_COOKIE } from "../src/auth.mjs";
import { openDb } from "../src/db.mjs";

const SECRET = "test-secret";
const PASSWORD = "segredo";
const ITEM = {
  id: "a",
  title: "Alfa",
  body: "primeiro",
  status: "novo",
  owner: "",
  note: "",
};

let db;
let api;
let cookie;

beforeEach(async () => {
  const dir = mkdtempSync(join(tmpdir(), "mini-api-"));
  db = await openDb({ url: `file:${join(dir, "test.db")}` });
  await db.seed([ITEM]);
  api = createApi({ db, secret: SECRET, password: PASSWORD });
  cookie = createSession(SECRET, { ttlSeconds: 3600 });
});

afterEach(() => {
  db.close();
});

const authed = () => ({ [SESSION_COOKIE]: cookie });

describe("createApi", () => {
  it("requires authentication", async () => {
    const response = await api({
      method: "GET",
      pathname: "/api/items",
      cookies: {},
    });
    expect(response.status).toBe(401);
  });

  it("rejects a wrong password and accepts the right one", async () => {
    const bad = await api({
      method: "POST",
      pathname: "/api/login",
      form: { password: "errada" },
    });
    expect(bad.status).toBe(401);

    const good = await api({
      method: "POST",
      pathname: "/api/login",
      form: { password: PASSWORD },
    });
    expect(good.status).toBe(302);
    expect(good.headers["set-cookie"]).toContain(SESSION_COOKIE);
  });

  it("reports auth state and never caches", async () => {
    const anon = await api({ method: "GET", pathname: "/api/me", cookies: {} });
    expect(JSON.parse(anon.body)).toEqual({ authenticated: false });
    expect(anon.headers["cache-control"]).toBe("no-store");

    const ok = await api({
      method: "GET",
      pathname: "/api/me",
      cookies: authed(),
    });
    expect(JSON.parse(ok.body)).toEqual({ authenticated: true });
  });

  it("returns the items fragment with pagination", async () => {
    const response = await api({
      method: "GET",
      pathname: "/api/items",
      query: { page: "1" },
      cookies: authed(),
    });
    expect(response.status).toBe(200);
    expect(response.body).toContain('data-id="a"');
    expect(response.body).toContain("Página 1 de 1");
  });

  it("updates an item and returns the refreshed row", async () => {
    const response = await api({
      method: "POST",
      pathname: "/api/items/a",
      form: { status: "concluido", note: "feito", owner: "Ana" },
      cookies: authed(),
    });
    expect(response.status).toBe(200);
    expect(response.body).toContain('value="concluido" selected');

    const stored = await db.get("a");
    expect(stored.status).toBe("concluido");
    expect(stored.owner).toBe("Ana");
  });

  it("clears the session on logout and 404s elsewhere", async () => {
    const logout = await api({
      method: "GET",
      pathname: "/logout",
      cookies: authed(),
    });
    expect(logout.status).toBe(302);
    expect(logout.headers["set-cookie"]).toContain("Max-Age=0");

    const missing = await api({
      method: "GET",
      pathname: "/api/nada",
      cookies: authed(),
    });
    expect(missing.status).toBe(404);
  });
});
