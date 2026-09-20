// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("lint-staged config", () => {
  it("never routes toml to prettier (which has no toml parser)", () => {
    const patterns = Object.keys(packageJson["lint-staged"] ?? {});
    expect(patterns.some((pattern) => pattern.includes("toml"))).toBe(false);
  });
});
