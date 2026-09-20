// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO, parseArgs, TOOLING_FILES } from "../scripts/update.mjs";

describe("parseArgs", () => {
  it("defaults to a dry run on the upstream starter", () => {
    expect(parseArgs([])).toEqual({
      write: false,
      help: false,
      repo: DEFAULT_REPO,
    });
  });

  it("reads --write, --repo= and a positional url", () => {
    expect(parseArgs(["--write"]).write).toBe(true);
    expect(parseArgs(["--repo=https://x/y.git"]).repo).toBe("https://x/y.git");
    expect(parseArgs(["https://x/y.git"]).repo).toBe("https://x/y.git");
    expect(parseArgs(["-h"]).help).toBe(true);
  });
});

describe("TOOLING_FILES", () => {
  it("never lists domain code, docs or package.json", () => {
    const untouchable = [
      "package.json",
      "README.md",
      "AGENTS.md",
      "public/index.html",
      "src/render.mjs",
      "src/api.mjs",
      "src/db.mjs",
      "src/auth.mjs",
      "src/data/items.json",
    ];
    for (const file of untouchable) {
      expect(TOOLING_FILES).not.toContain(file);
    }
  });

  it("lists the generic adapters and tooling config", () => {
    expect(TOOLING_FILES).toContain("netlify/functions/api.mjs");
    expect(TOOLING_FILES).toContain("src/static.mjs");
    expect(TOOLING_FILES).toContain("vitest.config.js");
  });
});
