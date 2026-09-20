import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDb } from "../src/db.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(resolve(here, "../src/data/items.json"), "utf8"),
);

const db = await openDb({});

await db.seed(seed.items ?? []);
db.close();

console.log(`Seed concluído: ${(seed.items ?? []).length} itens.`);
