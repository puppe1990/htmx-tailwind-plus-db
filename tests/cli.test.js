// @vitest-environment node
import { describe, expect, it } from "vitest";
import { COMMANDS, resolveCommand } from "../bin/cli.mjs";

describe("cli", () => {
  it("exposes the minimal command set", () => {
    expect(Object.keys(COMMANDS).sort()).toEqual(["doctor", "new", "update"]);
  });

  it("returns undefined for an unknown command", () => {
    expect(resolveCommand("nope")).toBeUndefined();
    expect(resolveCommand("doctor")).toBeTypeOf("function");
  });
});
