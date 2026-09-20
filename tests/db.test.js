// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb, pickClientModule } from "../src/db.mjs";

const ITEMS = [
  { id: "a", title: "Alfa", body: "primeiro", status: "novo" },
  { id: "b", title: "Bravo", body: "segundo", status: "ativo" },
  { id: "c", title: "Charlie", body: "terceiro", status: "novo" },
];

let db;

beforeEach(async () => {
  const dir = mkdtempSync(join(tmpdir(), "mini-db-"));
  db = await openDb({ url: `file:${join(dir, "test.db")}` });
  await db.seed(ITEMS);
});

afterEach(() => {
  db.close();
});

describe("pickClientModule", () => {
  it("uses the native client only for local files", () => {
    expect(pickClientModule("file:local.db")).toBe("node");
    expect(pickClientModule("libsql://db.turso.io")).toBe("web");
    expect(pickClientModule("https://db.turso.io")).toBe("web");
  });
});

describe("openDb", () => {
  it("seeds and lists items by id", async () => {
    const { items, total } = await db.list();
    expect(total).toBe(3);
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(items[0]).toMatchObject({ status: "novo", note: "", owner: "" });
  });

  it("is idempotent and preserves status/note/owner on re-seed", async () => {
    await db.update("a", { status: "arquivado", note: "feito", owner: "Ana" });
    await db.seed([...ITEMS, { id: "a", title: "Alfa 2", body: "novo texto" }]);

    const { items } = await db.list();
    expect(items).toHaveLength(3);
    const a = await db.get("a");
    expect(a.title).toBe("Alfa 2");
    expect(a.status).toBe("arquivado");
    expect(a.note).toBe("feito");
    expect(a.owner).toBe("Ana");
  });

  it("updates status, owner and note", async () => {
    const updated = await db.update("b", {
      status: "concluido",
      owner: "Matheus",
      note: "ok",
    });
    expect(updated.status).toBe("concluido");
    expect(updated.owner).toBe("Matheus");
    expect(updated.updatedAt).toBeTruthy();
  });

  it("rejects an invalid status and unknown id", async () => {
    await expect(db.update("b", { status: "xx" })).rejects.toThrow();
    await expect(db.update("nao-existe", { note: "x" })).rejects.toThrow();
  });

  it("filters by status and accent-insensitive text", async () => {
    expect((await db.list({ status: "novo" })).items.map((i) => i.id)).toEqual([
      "a",
      "c",
    ]);
    expect((await db.list({ q: "BRAVO" })).items.map((i) => i.id)).toEqual([
      "b",
    ]);
  });

  it("paginates 10 per page and clamps the page", async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: `p${String(index).padStart(2, "0")}`,
      title: `Item ${index}`,
      body: "",
      status: "novo",
    }));
    await db.seed(many);

    const first = await db.list();
    expect(first.total).toBe(15);
    expect(first.totalPages).toBe(2);
    expect(first.items).toHaveLength(10);

    const second = await db.list({ page: 2 });
    expect(second.items).toHaveLength(5);

    const clamped = await db.list({ page: 99 });
    expect(clamped.page).toBe(2);
  });
});

describe("users", () => {
  it("creates a user and finds it case-insensitively", async () => {
    const created = await db.createUser({
      email: "Ana@Example.com",
      passwordHash: "hash",
    });
    expect(created.id).toBeTruthy();
    expect(created.email).toBe("ana@example.com");

    const found = await db.findUserByEmail("ANA@example.com");
    expect(found).toMatchObject({
      email: "ana@example.com",
      passwordHash: "hash",
    });
  });

  it("rejects a duplicate email", async () => {
    await db.createUser({ email: "a@b.com", passwordHash: "x" });
    await expect(
      db.createUser({ email: "A@B.com", passwordHash: "y" }),
    ).rejects.toThrow();
  });

  it("returns null for an unknown email", async () => {
    expect(await db.findUserByEmail("nope@x.com")).toBeNull();
  });
});
