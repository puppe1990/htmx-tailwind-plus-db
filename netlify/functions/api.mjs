import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApi } from "../../src/api.mjs";
import { parseCookies } from "../../src/auth.mjs";
import { openDb } from "../../src/db.mjs";

const here = dirname(fileURLToPath(import.meta.url));
let cachedApi;

async function getApi() {
  if (cachedApi) return cachedApi;
  const db = await openDb({});
  const seed = JSON.parse(
    readFileSync(join(here, "../../src/data/items.json"), "utf8"),
  );
  await db.seed(seed.items ?? []);
  cachedApi = createApi({
    db,
    secret: process.env.SESSION_SECRET,
    password: process.env.APP_PASSWORD,
    secureCookie: true,
  });
  return cachedApi;
}

export default async function handler(request) {
  const api = await getApi();
  const url = new URL(request.url);
  const form =
    request.method === "POST"
      ? Object.fromEntries((await request.formData()).entries())
      : {};

  const result = await api({
    method: request.method,
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams),
    form,
    cookies: parseCookies(request.headers.get("cookie")),
  });

  return new Response(result.body === "" ? null : result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export const config = { path: ["/api/*", "/logout"] };
