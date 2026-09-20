import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  openDb,
  pickClientModule,
  resolveAuthToken,
  resolveDatabaseUrl,
} from "../src/db.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const MIN_NODE_MAJOR = 22;

export function checkNodeVersion(version = process.versions.node) {
  const major = Number(String(version).split(".")[0]);
  return {
    ok: major >= MIN_NODE_MAJOR,
    label: `Node ${version}`,
    hint: major >= MIN_NODE_MAJOR ? "ok" : `precisa de Node ${MIN_NODE_MAJOR}+`,
  };
}

export function checkEnv(env = process.env) {
  const missing = ["APP_PASSWORD", "SESSION_SECRET"].filter((key) => !env[key]);
  return {
    ok: true,
    label: "Secrets",
    hint: missing.length
      ? `defaults de dev para ${missing.join(", ")}`
      : "APP_PASSWORD e SESSION_SECRET definidos",
  };
}

export function checkStyles() {
  const built = existsSync(join(here, "../public/styles.css"));
  return {
    ok: true,
    label: "Tailwind",
    hint: built ? "public/styles.css presente" : "sem build (dev usa Play CDN)",
  };
}

export async function checkDatabase(env = process.env) {
  const url = resolveDatabaseUrl(env);
  const kind = pickClientModule(url) === "node" ? "SQLite" : "libSQL remoto";
  try {
    const db = await openDb({ url, authToken: resolveAuthToken(env) });
    const { total } = await db.list({ pageSize: 1 });
    db.close();
    return { ok: true, label: `Banco (${kind})`, hint: `${total} itens` };
  } catch (error) {
    return { ok: false, label: `Banco (${kind})`, hint: error.message };
  }
}

export async function runDoctor(env = process.env) {
  const checks = [
    checkNodeVersion(env.NODE_VERSION),
    checkEnv(env),
    checkStyles(),
    await checkDatabase(env),
  ];
  for (const check of checks) {
    console.log(`${check.ok ? "✓" : "✗"} ${check.label}: ${check.hint}`);
  }
  const ok = checks.every((check) => check.ok);
  if (!ok) process.exitCode = 1;
  return ok;
}
