import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const statePath = resolve(here, "../.netlify/state.json");

function resolveSiteId() {
  if (process.env.NETLIFY_SITE_ID) return process.env.NETLIFY_SITE_ID;
  if (existsSync(statePath)) {
    const { siteId } = JSON.parse(readFileSync(statePath, "utf8"));
    if (siteId) return siteId;
  }
  return null;
}

const siteId = resolveSiteId();
if (!siteId) {
  console.error(
    "Site não linkado. Rode `netlify link` ou defina NETLIFY_SITE_ID antes de continuar.",
  );
  process.exit(1);
}

execFileSync(
  "netlify",
  [
    "api",
    "updateSite",
    "--data",
    JSON.stringify({
      site_id: siteId,
      body: { built_with_badge_enabled: false },
    }),
  ],
  { stdio: "ignore" },
);

console.log(`Selo "Powered by Netlify" desligado no site ${siteId}.`);
