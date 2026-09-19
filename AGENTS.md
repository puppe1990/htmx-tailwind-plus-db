# AGENTS.md

Mini-systems starter: HTMX + Tailwind + server-rendered HTML fragments, Turso (libSQL), Netlify.
Plain JavaScript ESM, no build step. Node 22+.

## Commands

```bash
npm install          # also installs husky hooks (prepare)
npm run dev          # http://localhost:4173  (password: demo1234)
npm run new <name>   # scaffold a sibling project, renamed
npm run ci           # format:check + lint + test  <-- run before done
npm run format       # prettier --write .
npm run seed         # upsert src/data/items.json into the DB
npm run deploy       # badge-off + netlify deploy --prod
```

Pre-commit runs `lint-staged` (eslint --fix + prettier) then `npm test`.

## Structure (one responsibility per file)

```
src/render.mjs   SSR only: pure functions returning HTML strings
src/db.mjs       persistence only: list/get/update/seed (Turso/libSQL)
src/auth.mjs     password, signed session, cookies
src/api.mjs      routes: createApi({ db, secret, password }) -> fragments
src/server.mjs   local Node adapter
netlify/functions/api.mjs   production adapter (same createApi)
public/index.html           client page
src/data/items.json         seed data
tests/*.test.js  mirror of src/*
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
- Format with Prettier; never argue style. Lint with ESLint flat config.

## HTMX invariants (breaking these ships a broken UI)

- The response is parsed inside a `<template>`: a bare `<tr>` is dropped. `renderFragment` returns the whole `<table>` and the form swaps `#items-panel` with `outerHTML`.
- `hx-trigger` on a non-input element defaults to `click`. Editable controls declare `hx-trigger="change"` and post the row (`hx-include="closest tr"`).
- Pagination controls live inside the swapped `#items-panel` and keep filters via `hx-include="#filters"`.
- Mobile: the table becomes cards via `data-label` + media query in `index.html`; keep the labels.

## Data and deploy caveats

- Local DB is a `file:` SQLite at `src/data/items.db` (gitignored). Prod uses `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`.
- Serverless must use `@libsql/client/web` for `libsql://` (the native client only for `file:`), or the Linux function crashes. See `pickClientModule` in `db.mjs`.
- Seed is idempotent and preserves `status`/`note`/`owner` on re-run.
- Authenticated responses are `Cache-Control: no-store`; the cookie is `Secure` in production.
- Env: `APP_PASSWORD`, `SESSION_SECRET` required in production (no defaults there).

## Done means

`npm run ci` green. No file over 500 lines. No duplicated htmx URL strings. Every new endpoint/behavior covered by a test.
