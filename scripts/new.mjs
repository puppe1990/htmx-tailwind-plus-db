import {
  cpSync,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const REPO_NAME = "htmx-tailwind-plus-db";
const REPO_TITLE = "HTMX Tailwind Plus DB";
const SKIP_DIRS = new Set([".git", "node_modules", ".netlify"]);
const TEXT_EXTENSIONS = new Set([
  ".json",
  ".md",
  ".mjs",
  ".js",
  ".html",
  ".toml",
  ".gitignore",
  ".prettierignore",
  ".prettierrc",
]);

function titleCase(slug) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (lstatSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

const [rawName, ...rest] = process.argv.slice(2);
if (!rawName) {
  console.error("Uso: npm run new <nome-do-projeto> [destino]");
  process.exit(1);
}

const name = rawName.trim().toLowerCase();
if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error(
    "Use apenas letras minúsculas, números e hífen (ex.: meu-painel).",
  );
  process.exit(1);
}

const target = resolve(rest[0] ?? join(root, ".."), name);
if (existsSync(target)) {
  console.error(`Destino já existe: ${target}`);
  process.exit(1);
}
if (target === root || target.startsWith(`${root}/`)) {
  console.error(
    "Escolha um destino fora deste projeto (ex.: ../meu-projeto ou npm run new meu-projeto).",
  );
  process.exit(1);
}

cpSync(root, target, {
  recursive: true,
  filter: (src) => {
    const base = src.split("/").pop();
    if (SKIP_DIRS.has(base)) return false;
    if (base.endsWith(".db")) return false;
    return true;
  },
});

const values = { [REPO_NAME]: name, [REPO_TITLE]: titleCase(name) };
for (const file of walk(target)) {
  const base = file.slice(file.lastIndexOf("/") + 1);
  const ext = base.startsWith(".") ? base : file.slice(file.lastIndexOf("."));
  if (!TEXT_EXTENSIONS.has(ext)) continue;
  const original = readFileSync(file, "utf8");
  let next = original;
  for (const [token, value] of Object.entries(values)) {
    next = next.split(token).join(value);
  }
  if (next !== original) writeFileSync(file, next);
}

for (const doc of ["README.md", "AGENTS.md"]) {
  if (!existsSync(join(target, doc))) {
    console.error(`Documento esperado ausente no projeto gerado: ${doc}`);
    process.exit(1);
  }
}

console.log(`Projeto criado em ${relative(process.cwd(), target) || "."}`);
console.log("\nPróximos passos:");
console.log(`  cd ${relative(process.cwd(), target) || "."}`);
console.log("  npm install");
console.log("  npm run dev    # http://localhost:4173 (senha: demo1234)");
console.log("  npm run ci");
