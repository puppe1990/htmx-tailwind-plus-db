import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApi } from "./api.mjs";
import { parseCookies } from "./auth.mjs";
import { openDb } from "./db.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4173);

const db = await openDb({});
const seed = JSON.parse(readFileSync(join(here, "data/items.json"), "utf8"));
await db.seed(seed.items ?? []);

const api = createApi({
  db,
  secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  password: process.env.APP_PASSWORD ?? "demo1234",
  secureCookie: false,
});

function readForm(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(Object.fromEntries(new URLSearchParams(body))));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    return res.end(readFileSync(join(here, "../public/index.html"), "utf8"));
  }

  const result = await api({
    method: req.method,
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams),
    form: req.method === "POST" ? await readForm(req) : {},
    cookies: parseCookies(req.headers.cookie),
  });

  res.writeHead(result.status, result.headers);
  res.end(result.body);
});

server.listen(port, () => {
  console.log(`Mini system: http://localhost:${port}`);
});
