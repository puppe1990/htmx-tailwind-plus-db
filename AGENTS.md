# AGENTS.md

Mini-systems starter: HTMX + Tailwind + server-rendered HTML fragments, SQLite (libSQL; Turso optional), Netlify.
Plain JavaScript ESM, no build step. Node 22+.

## Commands

```bash
npm install          # also installs husky hooks (prepare)
npm run dev          # http://localhost:4173  (password: demo1234)
npm run new <name>   # scaffold a sibling project, renamed
npm run update       # pull infra files from upstream starter (--write to apply)
npm run doctor       # check Node, secrets, DB reachability and CSS build
npm run ci           # format:check + lint + test  <-- run before done
npm run test:e2e     # Playwright HTMX flow (own DB + port); chromium needed
npm run build:css    # prebuild Tailwind into public/styles.css
npm run format       # prettier --write .
npm run seed         # upsert src/data/items.json into the DB
npm run deploy       # badge-off + netlify deploy --prod
```

Pre-commit runs `lint-staged` (eslint --fix + prettier) then `npm test`.

## Structure (one responsibility per file)

```
src/render.mjs   SSR only: pure functions returning HTML strings
src/db.mjs       persistence only: list/get/update/seed + users (SQLite/libSQL)
src/auth.mjs     password, scrypt hashing, signed session, cookies
src/static.mjs   content-type map + path-traversal guard for public/
src/api.mjs      routes: createApi({ db, secret, password }) -> fragments
src/server.mjs   local Node adapter
netlify/functions/api.mjs   production adapter (same createApi)
public/index.html           client page
src/data/items.json         seed data
src/styles/input.css        Tailwind entry for build:css
bin/cli.mjs      minimal CLI: new / update / doctor (npm scripts wrap it)
tests/*.test.js  mirror of src/*
e2e/*.spec.js    Playwright HTMX flows (playwright.config.js)
```

Flow: `public/index.html` (htmx) -> `api.mjs` -> `db.mjs`; `render.mjs` builds every fragment.

## Rules

- Files 200–300 lines, hard cap 500. Functions 4–20 lines, one job.
- Names unique and greppable (`rg renderPagination` finds exactly one). No `data`/`handler`/`Manager`/`utils`.
- Keep WHY comments (non-obvious intent, upstream constraints). Delete obvious ones.
- Prefer early returns; max 2 nesting levels.
- Errors include the offender: `throw new Error(\`item não encontrado: ${id}\`)`.
- Inject I/O: `openDb({ url })`, `createApi({ db, ... })`. Never import a client deep inside a renderer.
- Escape **all** user data with `escapeHtml` before it enters HTML.
- New behavior -> new test first. Bugfix -> regression test. Tests must run headless with `npm run ci`.
- Any `hx-*` flow (trigger, target, include, swap) -> cover in `e2e/*.spec.js`; unit tests cannot see it.
- Format with Prettier; never argue style. Lint with ESLint flat config.

## HTMX invariants (breaking these ships a broken UI)

- The response is parsed inside a `<template>`: a bare `<tr>` is dropped. `renderFragment` returns the whole `<table>` and the form swaps `#items-panel` with `outerHTML`.
- `hx-trigger` on a non-input element defaults to `click`. Editable controls declare `hx-trigger="change"` and post the row (`hx-include="closest tr"`).
- Pagination controls live inside the swapped `#items-panel` and keep filters via `hx-include="#filters"`.
- Mobile: the table becomes cards via `data-label` + media query in `index.html`; keep the labels.

## Adopting this stack into an existing repo

The rule "never create `.md` files proactively" does **not** apply here: when you
adopt this starter into an existing project (not via `npm run new`), creating or
updating `AGENTS.md` and `README.md` for the target project is required, not
optional. They carry the conventions (file size, `escapeHtml` everywhere, inject
I/O, run `npm run ci`) that keep agent-generated code consistent.

Adoption checklist:

- [ ] Copy `src/` + `netlify/` adapters and `public/index.html`; keep the
      one-responsibility-per-file split.
- [ ] Add `AGENTS.md` (adapt the Rules to the new domain) and a project `README.md`.
- [ ] Add `.env.example`, `eslint.config.js`, `.prettierrc.json` and the npm
      scripts (`dev`, `ci`, `seed`) from `package.json`.
- [ ] Wire the Netlify adapter (`netlify/functions/api.mjs`) and `netlify.toml`.
- [ ] Run `npm run ci` before declaring done.

`npm run new <name>` already renames and ships `README.md` + `AGENTS.md`; this
checklist is for manual adoption.

## Updating a derived project

`npm run update` fetches the starter and syncs only the project-agnostic files
listed in `TOOLING_FILES` (`scripts/update.mjs`): tooling/e2e config, the Netlify
adapter, `src/static.mjs` and helper scripts. It is a dry-run by default; `npm run
update -- --write` applies and stages. Never let it touch domain code
(`render.mjs`, `api.mjs`, `db.mjs`, `auth.mjs`), `README.md`, `AGENTS.md` or
`package.json` — when upstream changes those, review the diff and port by hand.
Add new syncable files to `TOOLING_FILES` only if they stay project-agnostic.

## Data and deploy caveats

- DB is SQLite by default (`file:src/data/items.db`, gitignored); set `DATABASE_URL` to a `libsql://` URL for Turso (managed) or any SQLite path. `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` remain legacy aliases. `resolveDatabaseUrl` / `resolveAuthToken` in `db.mjs` define precedence.
- Serverless must use `@libsql/client/web` for `libsql://` (the native client only for `file:`), or the Linux function crashes. See `pickClientModule` in `db.mjs`.
- Seed is idempotent and preserves `status`/`note`/`owner` on re-run.
- Schema changes: append a `{ name, statements }` entry to `MIGRATIONS` in `db.mjs`; never edit a shipped entry. `runMigrations` records them in `_migrations` and is idempotent, so old databases get the change on boot.
- Authenticated responses are `Cache-Control: no-store`; the cookie is `Secure` in production.
- Env: `APP_PASSWORD`, `SESSION_SECRET` required in production (no defaults there). Local `npm run dev` loads `.env` via `--env-file-if-exists`; `.env.example` lists every variable.
- Optional multi-user (keep single-password as default): `hashPassword`/`verifyPassword` (scrypt) in `auth.mjs`, `db.createUser`/`findUserByEmail`, and `createSession(secret, { userId })` + `readSession`. User id must not contain dots.
- Tailwind: pages load `/styles.css` and fall back to the Play CDN when it is missing. `npm run build:css` (Netlify build command) generates it. Keep class names literal (v4 scans `public/**` and `src/**/*.mjs`), and add new entry CSS to `src/styles/input.css`.

## Done means

`npm run ci` green. No file over 500 lines. No duplicated htmx URL strings. Every new endpoint/behavior covered by a test.
