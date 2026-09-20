// @vitest-environment node
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contentTypeFor,
  readStatic,
  resolveStaticFile,
} from "../src/static.mjs";

const ROOT = "/srv/app/public";

describe("contentTypeFor", () => {
  it("maps common asset extensions", () => {
    expect(contentTypeFor("app.js")).toBe("text/javascript; charset=utf-8");
    expect(contentTypeFor("style.css")).toBe("text/css; charset=utf-8");
    expect(contentTypeFor("logo.svg")).toBe("image/svg+xml");
    expect(contentTypeFor("favicon.ico")).toBe("image/x-icon");
    expect(contentTypeFor("font.woff2")).toBe("font/woff2");
  });

  it("falls back to octet-stream for unknown extensions", () => {
    expect(contentTypeFor("archive.bin")).toBe("application/octet-stream");
    expect(contentTypeFor("LICENSE")).toBe("application/octet-stream");
  });
});

describe("resolveStaticFile", () => {
  it("resolves paths inside the public root", () => {
    expect(resolveStaticFile("/app.js", ROOT)).toBe(join(ROOT, "app.js"));
    expect(resolveStaticFile("/js/reader.js", ROOT)).toBe(
      join(ROOT, "js/reader.js"),
    );
    expect(resolveStaticFile("/nested/../app.js", ROOT)).toBe(
      join(ROOT, "app.js"),
    );
  });

  it("rejects path traversal attempts", () => {
    expect(resolveStaticFile("/../secret.txt", ROOT)).toBeNull();
    expect(resolveStaticFile("/../../etc/passwd", ROOT)).toBeNull();
    expect(resolveStaticFile("/%2e%2e/%2e%2e/etc/passwd", ROOT)).toBeNull();
    expect(resolveStaticFile("/a/../../secret", ROOT)).toBeNull();
  });

  it("rejects null bytes and empty segments", () => {
    expect(resolveStaticFile("/app%00.js", ROOT)).toBeNull();
    expect(resolveStaticFile("/..", ROOT)).toBeNull();
  });
});

describe("readStatic", () => {
  const readFile = (filePath) => {
    if (filePath.endsWith("app.js")) return "console.log(1)";
    throw new Error("ENOENT");
  };

  it("returns a no-store response with the right content type", () => {
    const response = readStatic("/app.js", { root: ROOT, readFile });
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toBe("console.log(1)");
  });

  it("404s on traversal instead of reading outside the root", () => {
    const response = readStatic("/../../etc/passwd", { root: ROOT, readFile });
    expect(response.status).toBe(404);
  });

  it("returns null for a missing asset so the API can handle it", () => {
    expect(readStatic("/missing.js", { root: ROOT, readFile })).toBeNull();
  });
});
