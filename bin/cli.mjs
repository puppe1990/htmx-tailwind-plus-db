#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { runDoctor } from "../scripts/doctor.mjs";
import { runNew } from "../scripts/new.mjs";
import { runUpdate } from "../scripts/update.mjs";

export const COMMANDS = {
  new: runNew,
  update: runUpdate,
  doctor: () => runDoctor(),
};

export function resolveCommand(name) {
  return COMMANDS[name];
}

const USAGE = `HTMX Tailwind Plus DB

Uso: htmx-tailwind-plus-db <comando> [args]

  new <nome> [destino]   Cria um projeto novo (renomeado)
  update [--write]       Sincroniza os arquivos de infra do starter
  doctor                 Checa Node, secrets, banco e assets
`;

async function main(argv) {
  const [name, ...rest] = argv;
  if (!name || name === "--help" || name === "-h") {
    console.log(USAGE);
    return;
  }
  const run = resolveCommand(name);
  if (!run) {
    console.error(`Comando desconhecido: ${name}\n`);
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }
  await run(rest);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main(process.argv.slice(2));
}
