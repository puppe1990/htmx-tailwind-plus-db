import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGE_SIZE, STATUSES } from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_URL =
  process.env.TURSO_DATABASE_URL ?? `file:${join(here, "data/items.db")}`;

export function pickClientModule(databaseUrl) {
  return String(databaseUrl).startsWith("file:") ? "node" : "web";
}

async function loadClient(databaseUrl, authToken) {
  const module =
    pickClientModule(databaseUrl) === "node"
      ? await import("@libsql/client")
      : await import("@libsql/client/web");
  return module.createClient({ url: databaseUrl, authToken });
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'novo',
  owner TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT
)`;

const USERS_SCHEMA = `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT
)`;

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function rowToUser(row) {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at ?? null,
  };
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function rowToItem(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? "",
    status: row.status ?? "novo",
    owner: row.owner ?? "",
    note: row.note ?? "",
    updatedAt: row.updated_at ?? null,
  };
}

export async function openDb({ url, authToken } = {}) {
  const client = await loadClient(
    url ?? DEFAULT_URL,
    authToken ?? process.env.TURSO_AUTH_TOKEN,
  );

  await client.execute(SCHEMA);
  await client.execute(USERS_SCHEMA);

  async function get(id) {
    const result = await client.execute({
      sql: "SELECT * FROM items WHERE id = ?",
      args: [id],
    });
    return result.rows[0] ? rowToItem(result.rows[0]) : null;
  }

  async function seed(items) {
    if (!items.length) return;
    const now = new Date().toISOString();
    await client.batch(
      items.map((item) => ({
        sql: `INSERT INTO items (id, title, body, status, owner, note, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                body = excluded.body,
                updated_at = excluded.updated_at`,
        args: [
          item.id,
          item.title,
          item.body ?? "",
          item.status ?? "novo",
          item.owner ?? "",
          item.note ?? "",
          item.updatedAt ?? now,
        ],
      })),
      "write",
    );
  }

  async function list({ q, status, page = 1, pageSize = PAGE_SIZE } = {}) {
    const result = await client.execute("SELECT * FROM items");
    const query = normalize(q);
    const filtered = result.rows
      .map(rowToItem)
      .filter((item) => {
        if (status && status !== "todos" && item.status !== status)
          return false;
        if (!query) return true;
        return normalize(
          `${item.id} ${item.title} ${item.body} ${item.owner}`,
        ).includes(query);
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (current - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      total,
      page: current,
      pageSize,
      totalPages,
    };
  }

  async function update(id, patch = {}) {
    if (patch.status !== undefined && !STATUSES.includes(patch.status)) {
      throw new Error(`status inválido: ${patch.status}`);
    }
    const current = await get(id);
    if (!current) throw new Error(`item não encontrado: ${id}`);

    const next = {
      ...current,
      status: patch.status ?? current.status,
      owner: patch.owner ?? current.owner,
      note: patch.note ?? current.note,
      updatedAt: new Date().toISOString(),
    };

    await client.execute({
      sql: "UPDATE items SET status = ?, owner = ?, note = ?, updated_at = ? WHERE id = ?",
      args: [next.status, next.owner, next.note, next.updatedAt, id],
    });
    return next;
  }

  async function findUserByEmail(email) {
    const result = await client.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [normalizeEmail(email)],
    });
    return result.rows[0] ? rowToUser(result.rows[0]) : null;
  }

  async function createUser({ id = randomUUID(), email, passwordHash }) {
    const normalized = normalizeEmail(email);
    await client.execute({
      sql: "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
      args: [id, normalized, passwordHash, new Date().toISOString()],
    });
    return { id, email: normalized };
  }

  return {
    get,
    seed,
    list,
    update,
    findUserByEmail,
    createUser,
    close: () => client.close(),
  };
}
