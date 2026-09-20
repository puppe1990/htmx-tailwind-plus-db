// @vitest-environment node
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
let generated;

// Built from parts so this assertion survives `npm run new`'s token rename in a
// derived project (the literal starter slug would be rewritten there).
const STARTER_SLUG = ["htmx", "tailwind", "plus", "db"].join("-");

afterEach(() => {
  if (generated) rmSync(generated, { recursive: true, force: true });
  generated = undefined;
});

function scaffold(name) {
  const dir = mkdtempSync(join(tmpdir(), "mini-new-"));
  execFileSync("node", ["scripts/new.mjs", name, dir], { cwd: root });
  generated = join(dir, name);
  return generated;
}

describe("npm run new", () => {
  it("ships README.md and AGENTS.md in the generated project", () => {
    const project = scaffold("smoke-project");
    expect(existsSync(join(project, "README.md"))).toBe(true);
    expect(existsSync(join(project, "AGENTS.md"))).toBe(true);
  });

  it("keeps the upstream repo reference the update script relies on", async () => {
    const project = scaffold("smoke-project");
    const { DEFAULT_REPO } = await import(
      pathToFileURL(join(project, "scripts/update.mjs")).href
    );
    expect(DEFAULT_REPO).toBe(
      `https://github.com/puppe1990/${STARTER_SLUG}.git`,
    );
    expect(DEFAULT_REPO).not.toContain("smoke-project");
  });
});
