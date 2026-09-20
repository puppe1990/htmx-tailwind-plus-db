import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const STARTER_OWNER = "puppe1990";
// Built from parts on purpose: `npm run new` replaces the literal starter slug
// in every text file, which would otherwise rewrite this upstream reference in
// the generated project and point `npm run update` at a non-existent repo.
const STARTER_SLUG = ["htmx", "tailwind", "plus", "db"].join("-");
export const DEFAULT_REPO = `https://github.com/${STARTER_OWNER}/${STARTER_SLUG}.git`;

// Project-agnostic files only. Domain code (render/api/db/auth), docs and
// package.json are intentionally excluded: overwriting them would clobber the
// adopting project's changes. Review the diff before applying.
export const TOOLING_FILES = [
  ".env.example",
  ".github/workflows/ci.yml",
  ".prettierignore",
  ".prettierrc.json",
  "bin/cli.mjs",
  "eslint.config.js",
  "netlify/functions/api.mjs",
  "playwright.config.js",
  "scripts/disable-badge.mjs",
  "scripts/doctor.mjs",
  "scripts/update.mjs",
  "src/static.mjs",
  "src/styles/input.css",
  "vitest.config.js",
];

export function parseArgs(argv) {
  const options = { write: false, help: false, repo: DEFAULT_REPO };
  for (const arg of argv) {
    if (arg === "--write") options.write = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--repo=")) options.repo = arg.slice(7);
    else if (!arg.startsWith("-")) options.repo = arg;
  }
  return options;
}

function git(args) {
  return spawnSync("git", args, { encoding: "utf8" });
}

// "same" | "changed" | "new" (only upstream) | "local-only" | "absent"
function upstreamState(ref, file) {
  const upstream = git(["cat-file", "-e", `${ref}:${file}`]).status === 0;
  const local = existsSync(file);
  if (!upstream) return local ? "local-only" : "absent";
  if (!local) return "new";
  return git(["diff", "--quiet", ref, "--", file]).status === 1
    ? "changed"
    : "same";
}

function collectChanges(ref, files) {
  const changes = [];
  for (const file of files) {
    const state = upstreamState(ref, file);
    if (state === "changed" || state === "new") changes.push({ file, state });
  }
  return changes;
}

function printHelp() {
  console.log(`Uso: npm run update [-- --write] [--repo=<url>]

Atualiza os arquivos de infra (config, adapters, scripts) a partir do starter.
Sem --write é dry-run: mostra o que mudou e o diff. Com --write aplica e deixa
staged. Nunca toca em src/render.mjs, src/api.mjs, src/db.mjs, src/auth.mjs,
README.md, AGENTS.md, package.json nem no conteúdo do app.`);
}

export function runUpdate(argv = process.argv.slice(2)) {
  const { write, repo, help } = parseArgs(argv);
  if (help) return printHelp();

  const fetched = git(["fetch", "--quiet", repo, "main"]);
  if (fetched.status !== 0) {
    console.error(`Falha no git fetch de ${repo}:\n${fetched.stderr}`);
    process.exit(1);
  }

  const changes = collectChanges("FETCH_HEAD", TOOLING_FILES);
  if (changes.length === 0) {
    console.log("Nada para atualizar: arquivos de infra já estão em dia.");
    return;
  }

  console.log("Arquivos de infra desatualizados:");
  for (const { file, state } of changes) {
    console.log(`  ${state === "new" ? "+" : "M"} ${file}`);
  }

  if (!write) {
    console.log(
      "\nDry-run. Rode `npm run update -- --write` para aplicar. Diff:\n",
    );
    const diff = git([
      "diff",
      "FETCH_HEAD",
      "--",
      ...changes.map((c) => c.file),
    ]);
    process.stdout.write(diff.stdout ?? "");
    return;
  }

  const applied = git([
    "checkout",
    "FETCH_HEAD",
    "--",
    ...changes.map((c) => c.file),
  ]);
  if (applied.status !== 0) {
    console.error(applied.stderr);
    process.exit(1);
  }
  console.log(
    "\nAplicado e staged. Revise `git diff --staged`, rode `npm install` e `npm run ci`.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runUpdate();
}
