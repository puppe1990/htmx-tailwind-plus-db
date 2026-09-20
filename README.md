# HTMX Turso Starter

Mini-systems starter built with **HTMX + Tailwind + server-rendered HTML fragments**, **Turso (libSQL)** for persistence, and **Netlify** for deploy.

- List with search, status filter and pagination (10 per page).
- Each item has `status`, `note` and `owner` persisted in the database (auto-save on change).
- The table turns into cards on mobile.
- Single-password login (signed `HttpOnly` cookie).

> Use this template on GitHub (**Use this template**) or clone it and run `npm run new <name>` to scaffold a new project.

Agent contributors: read [AGENTS.md](./AGENTS.md) first.

## Run locally

```bash
npm install
cp .env.example .env   # optional: custom password/secret (dev works without it)
npm run dev        # http://localhost:4173  (password: demo1234)
npm run seed       # seeds from src/data/items.json
npm run ci         # format + lint + unit tests
npm run test:e2e   # Playwright HTMX flow (installs its own DB/port)
npm run build:css  # optional: prebuild Tailwind CSS
```

`npm run dev` loads `.env` automatically when present (`--env-file-if-exists`), so
the dev defaults (`demo1234` / `dev-secret-change-me`) only apply when a variable
is unset. `.env.example` lists every variable the app reads.

Locally it uses a SQLite file (`src/data/items.db`). In production it uses Turso via env vars.

## Scaffold a new project

```bash
npm run new my-system        # creates ../my-system with package name and title renamed
```

## Updating a derived project

The starter is not a dependency, so updates are explicit. From the derived repo:

```bash
npm run update             # dry-run: fetch upstream, list changed infra files, show diff
npm run update -- --write  # apply them (left staged)
npm install && npm run ci  # then verify
```

Only project-agnostic files are touched — config, adapters and scripts, listed in
`TOOLING_FILES` (`scripts/update.mjs`). Domain code (`src/render.mjs`,
`src/api.mjs`, `src/db.mjs`, `src/auth.mjs`), `README.md`, `AGENTS.md` and
`package.json` are **never** overwritten: read the upstream diff yourself.
For `src/db.mjs`, copy new `MIGRATIONS` entries (the runner applies them on boot;
never rewrite an entry already shipped). Use `--repo=<url>` to update from a fork.

If the derived project shares history with the starter (cloned or `npm run new`),
you can instead `git fetch` it and `git cherry-pick` / `git merge` the commits.

## Deploy (Netlify + Turso)

```bash
turso db create htmx-turso-starter
turso db show htmx-turso-starter --url          # -> TURSO_DATABASE_URL
turso db tokens create htmx-turso-starter       # -> TURSO_AUTH_TOKEN

TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run seed

netlify link                          # link this directory to a Netlify project
netlify env:set TURSO_DATABASE_URL "..."
netlify env:set TURSO_AUTH_TOKEN "..."
netlify env:set APP_PASSWORD "a-strong-password"
netlify env:set SESSION_SECRET "$(openssl rand -hex 32)"

npm run deploy                        # turns off the Netlify badge and ships to production
```

## Tailwind in production (optional build)

By default the pages fall back to the Tailwind **Play CDN**: zero build, but it
prints a console warning and does JIT in the browser, so it is not meant for
production. To ship real CSS:

```bash
npm run build:css    # writes public/styles.css (gitignored)
```

Netlify already runs this as its build command (`netlify.toml`). Pages load
`/styles.css` first and only fall back to the CDN when it is missing, so dev
(`npm run dev`, no build) keeps working and production serves no CDN. Tailwind v4
scans `public/**` and `src/**/*.mjs`, so keep class names literal.

## Structure

```
src/render.mjs   SSR: pure functions that return HTML (rows, fragment, login)
src/db.mjs       repository (Turso/libSQL): list/get/update/seed + users
src/auth.mjs     password + hashing (scrypt) + signed session + cookies
src/static.mjs   static assets from public/ (content-type + path-traversal guard)
src/api.mjs      createApi({ db, secret, password }) -> HTML fragments
src/server.mjs   Node adapter for local development
netlify/functions/api.mjs   production adapter (same createApi)
public/index.html           page (HTMX + Tailwind)
src/data/items.json         seed
src/styles/input.css        Tailwind entry for `npm run build:css`
```

## Optional: multiple users instead of a shared password

The default is a single shared password. To move to per-user accounts, keep that
mode and add the user path on the side:

1. `db.createUser({ email, passwordHash })` / `db.findUserByEmail(email)` persist
   accounts (unique e-mail, stored lowercase). See `src/db.mjs`.
2. `hashPassword` / `verifyPassword` in `src/auth.mjs` hash with `scrypt` (random
   salt, timing-safe compare) — no native dependency.
3. Put the user id in the session: `createSession(secret, { userId })` and read it
   back with `readSession(secret, token)` -> `{ userId, expiresAt }`. Keep the user
   id free of dots (`user.id`, not the e-mail) because it is part of the payload.
4. In `api.mjs`, resolve `readSession(...)` per request and swap the
   `authenticated` boolean for the real user; expose `/api/register` + `/api/login`.

The anonymous path (`createSession(secret)` / `verifySession`) is unchanged, so
existing single-password deployments keep working.

## Schema migrations

`openDb` runs `runMigrations` on every start and records applied entries in a
`_migrations` table, so an existing database (including production on Turso) is
brought up to date without dropping data. To evolve the schema, append a new
entry to `MIGRATIONS` in `src/db.mjs`:

```js
{ name: "0003_items_priority", statements: ["ALTER TABLE items ADD COLUMN priority TEXT DEFAULT ''"] }
```

Names are append-only: never edit a shipped entry (databases that already applied
it will skip the change). Statement + ledger insert run in one transaction, so a
failed migration rolls back.

## SSR at the root on Netlify

The example serves `/` from the static `public/index.html`. If the root (or
`/signin`, `/signup`) must render server-side from Turso:

1. List every server-rendered route in the function's `config.path`:
   `export const config = { path: ["/", "/signin", "/signup", "/logout", "/api/*"] };`
2. Add one `[[redirects]]` per route in `netlify.toml` (see the commented block
   in that file). Do **not** use `from = "/*"` without `force`, or you shadow the
   static assets in `public/`; keeping the list explicit avoids silent 404s.

## End-to-end tests (HTMX)

Unit tests cannot catch a broken `hx-*` attribute, so `npm run test:e2e` boots the
real server (dedicated port + `src/data/e2e.db`) with Playwright and drives the
main flow: login, search, edit status (persisted through the HTMX row swap),
pagination and logout, plus the password show/hide toggle. It runs in CI in its
own `e2e` job; install the browser locally with `npx playwright install chromium`.

## Gotchas already handled (don't break these)

- HTMX parses the response inside a `<template>`, so a bare `<tr>` gets dropped. That's why the fragment returns the whole `<table id="items-table">` and the form swaps `#items-panel` with `outerHTML`.
- `hx-trigger` on a non-input element defaults to `click`: the select/inputs always declare `hx-trigger="change"`.
- Escape **all** user content with `escapeHtml` (XSS protection in SSR).
- Serverless: use `@libsql/client/web` for `libsql://`; the native client only for `file:` (otherwise the Linux function crashes).
- Authenticated responses use `Cache-Control: no-store`; the cookie is `Secure` in production.
