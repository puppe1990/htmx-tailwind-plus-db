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
npm run dev        # http://localhost:4173  (password: demo1234)
npm run seed       # seeds from src/data/items.json
npm run ci         # format + lint + tests
```

Locally it uses a SQLite file (`src/data/items.db`). In production it uses Turso via env vars.

## Scaffold a new project

```bash
npm run new my-system        # creates ../my-system with package name and title renamed
```

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

## Structure

```
src/render.mjs   SSR: pure functions that return HTML (rows, fragment, login)
src/db.mjs       repository (Turso/libSQL): list/get/update/seed
src/auth.mjs     password + signed session + cookies
src/api.mjs      createApi({ db, secret, password }) -> HTML fragments
src/server.mjs   Node adapter for local development
netlify/functions/api.mjs   production adapter (same createApi)
public/index.html           page (HTMX + Tailwind)
src/data/items.json         seed
```

## Gotchas already handled (don't break these)

- HTMX parses the response inside a `<template>`, so a bare `<tr>` gets dropped. That's why the fragment returns the whole `<table id="items-table">` and the form swaps `#items-panel` with `outerHTML`.
- `hx-trigger` on a non-input element defaults to `click`: the select/inputs always declare `hx-trigger="change"`.
- Escape **all** user content with `escapeHtml` (XSS protection in SSR).
- Serverless: use `@libsql/client/web` for `libsql://`; the native client only for `file:` (otherwise the Linux function crashes).
- Authenticated responses use `Cache-Control: no-store`; the cookie is `Secure` in production.
