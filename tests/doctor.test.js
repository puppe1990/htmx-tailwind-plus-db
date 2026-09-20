// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkEnv, checkNodeVersion } from "../scripts/doctor.mjs";

describe("checkNodeVersion", () => {
  it("passes on Node 22+", () => {
    expect(checkNodeVersion("22.1.0").ok).toBe(true);
    expect(checkNodeVersion("23.0.0").ok).toBe(true);
  });

  it("fails below Node 22", () => {
    expect(checkNodeVersion("20.11.0").ok).toBe(false);
  });
});

describe("checkEnv", () => {
  it("stays non-fatal and points at the dev defaults", () => {
    const result = checkEnv({});
    expect(result.ok).toBe(true);
    expect(result.hint).toMatch(/APP_PASSWORD/);
    expect(result.hint).toMatch(/SESSION_SECRET/);
  });

  it("passes when both secrets are set", () => {
    const result = checkEnv({ APP_PASSWORD: "x", SESSION_SECRET: "y" });
    expect(result.ok).toBe(true);
    expect(result.hint).not.toMatch(/default/);
  });
});
