import {
  checkPassword,
  createSession,
  DEFAULT_TTL_SECONDS,
  serializeCookie,
  SESSION_COOKIE,
  verifySession,
} from "./auth.mjs";
import { renderFragment, renderLogin, renderRow } from "./render.mjs";

const HTML = "text/html; charset=utf-8";
const JSON_TYPE = "application/json; charset=utf-8";

export function createApi({
  db,
  secret,
  password,
  sessionTtl = DEFAULT_TTL_SECONDS,
  secureCookie = false,
}) {
  function headers(extra = {}) {
    return { "content-type": HTML, "cache-control": "no-store", ...extra };
  }

  function unauthorized() {
    return { status: 401, headers: headers(), body: renderLogin() };
  }

  function sessionCookie(value, maxAge) {
    return serializeCookie(SESSION_COOKIE, value, {
      maxAge,
      secure: secureCookie,
    });
  }

  return async function handle(request) {
    const {
      method = "GET",
      pathname = "/",
      query = {},
      form = {},
      cookies = {},
    } = request;
    const authenticated = verifySession(secret, cookies[SESSION_COOKIE]);

    if (pathname === "/api/login" && method === "POST") {
      if (!checkPassword(form.password, password)) {
        return {
          status: 401,
          headers: headers(),
          body: renderLogin({ error: true }),
        };
      }
      const token = createSession(secret, { ttlSeconds: sessionTtl });
      return {
        status: 302,
        headers: headers({
          location: "/",
          "set-cookie": sessionCookie(token, sessionTtl),
        }),
        body: "",
      };
    }

    if (pathname === "/logout" && method === "GET") {
      return {
        status: 302,
        headers: headers({ location: "/", "set-cookie": sessionCookie("", 0) }),
        body: "",
      };
    }

    if (pathname === "/api/me" && method === "GET") {
      return {
        status: 200,
        headers: { "content-type": JSON_TYPE, "cache-control": "no-store" },
        body: JSON.stringify({ authenticated }),
      };
    }

    if (pathname === "/api/items" && method === "GET") {
      if (!authenticated) return unauthorized();
      const result = await db.list({
        q: query.q,
        status: query.status,
        page: query.page,
      });
      return {
        status: 200,
        headers: headers(),
        body: renderFragment(result),
      };
    }

    const match = pathname.match(/^\/api\/items\/(.+)$/);
    if (match && method === "POST") {
      if (!authenticated) return unauthorized();
      const id = decodeURIComponent(match[1]);
      const updated = await db.update(id, {
        status: form.status,
        note: form.note,
        owner: form.owner,
      });
      return { status: 200, headers: headers(), body: renderRow(updated) };
    }

    return {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: "not found",
    };
  };
}
