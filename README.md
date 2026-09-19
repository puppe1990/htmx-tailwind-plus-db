# HTMX Turso Starter

Mini sistema com **HTMX + Tailwind + SSR de fragmentos**, banco **Turso (libSQL)** e deploy no **Netlify**.

> Use como template no GitHub (**Use this template**) ou clone e rode `npm run new <nome>` para gerar um projeto novo.

- Lista com busca, filtro por status e paginação (10/página).
- Cada item tem `status`, `nota` e `responsável` persistidos no banco (auto-save ao mudar).
- Tabela vira cards no mobile.
- Login por senha única (cookie `HttpOnly` assinado).

## Rodar local

```bash
npm install
npm run dev        # http://localhost:4173  (senha: demo1234)
npm run seed       # popula a partir de src/data/items.json
npm run ci         # format + lint + testes
```

Local usa SQLite em arquivo (`src/data/items.db`). Em produção usa Turso via env vars.

## Deploy (Netlify + Turso)

```bash
turso db create htmx-turso-starter
turso db show htmx-turso-starter --url          # -> TURSO_DATABASE_URL
turso db tokens create htmx-turso-starter       # -> TURSO_AUTH_TOKEN

TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run seed

netlify link                          # vincula o diretório ao projeto
netlify env:set TURSO_DATABASE_URL "..."
netlify env:set TURSO_AUTH_TOKEN "..."
netlify env:set APP_PASSWORD "uma-senha-forte"
netlify env:set SESSION_SECRET "$(openssl rand -hex 32)"

npm run deploy                        # desliga o selo do Netlify e publica
```

## Estrutura

```
src/render.mjs   SSR: funções puras que devolvem HTML (linhas, fragmento, login)
src/db.mjs       repositório (Turso/libSQL): list/get/update/seed
src/auth.mjs     senha + sessão assinada + cookies
src/api.mjs      createApi({ db, secret, password }) -> fragmentos
src/server.mjs   adaptador Node para desenvolvimento
netlify/functions/api.mjs   adaptador de produção (mesma createApi)
public/index.html           página (HTMX + Tailwind)
src/data/items.json         seed
```

## Armadilhas já resolvidas (não re-quebre)

- O HTMX parseia a resposta num `<template>`: `<tr>` solto é descartado. Por isso o fragmento devolve a `<table id="items-table">` inteira e o form troca `#items-panel` com `outerHTML`.
- `hx-trigger` em elemento que não é input é `click`: o select/inputs sempre declaram `hx-trigger="change"`.
- Escapar **todo** conteúdo de usuário com `escapeHtml` (anti-XSS no SSR).
- Serverless: `@libsql/client/web` para `libsql://`; o client nativo só em `file:` (senão quebra na function Linux).
- Respostas autenticadas com `Cache-Control: no-store`; cookie `Secure` em produção.
