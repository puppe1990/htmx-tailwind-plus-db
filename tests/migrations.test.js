// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../src/db.mjs";

let client;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "mini-migrations-"));
  client = createClient({ url: `file:${join(dir, "test.db")}` });
});

afterEach(() => client.close());

async function appliedNames() {
  const result = await client.execute(
    "SELECT name FROM _migrations ORDER BY name",
  );
  return result.rows.map((row) => row.name);
}

describe("runMigrations", () => {
  it("applies pending migrations in order", async () => {
    await runMigrations(client, [
      { name: "0001_a", statements: ["CREATE TABLE a (id TEXT)"] },
      { name: "0002_b", statements: ["CREATE TABLE b (id TEXT)"] },
    ]);

    expect(await appliedNames()).toEqual(["0001_a", "0002_b"]);
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    expect(tables.rows.map((row) => row.name)).toEqual(
      expect.arrayContaining(["a", "b"]),
    );
  });

  it("skips migrations that were already applied", async () => {
    const migrations = [
      { name: "0001_a", statements: ["CREATE TABLE a (id TEXT)"] },
    ];
    await runMigrations(client, migrations);
    await expect(runMigrations(client, migrations)).resolves.toBeUndefined();
    expect(await appliedNames()).toEqual(["0001_a"]);
  });

  it("alters an existing table without losing data", async () => {
    await client.execute(
      "CREATE TABLE items (id TEXT PRIMARY KEY, title TEXT)",
    );
    await client.execute("INSERT INTO items (id, title) VALUES ('a', 'Alfa')");

    await runMigrations(client, [
      {
        name: "0001_add_owner",
        statements: ["ALTER TABLE items ADD COLUMN owner TEXT DEFAULT ''"],
      },
    ]);

    const info = await client.execute("PRAGMA table_info(items)");
    expect(info.rows.map((row) => row.name)).toContain("owner");
    const rows = await client.execute("SELECT * FROM items");
    expect(rows.rows[0].title).toBe("Alfa");
  });
});
