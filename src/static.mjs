import { join, normalize, sep } from "node:path";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function contentTypeFor(filePath) {
  const dot = filePath.lastIndexOf(".");
  const extension = dot === -1 ? "" : filePath.slice(dot).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

function decodePathname(pathname) {
  try {
    return decodeURIComponent(String(pathname));
  } catch {
    return null;
  }
}

export function resolveStaticFile(pathname, root) {
  const decoded = decodePathname(pathname);
  if (decoded === null || decoded.includes("\0")) return null;
  const base = normalize(root);
  const target = normalize(join(base, decoded));
  if (!target.startsWith(`${base}${sep}`)) return null;
  return target;
}

export function readStatic(pathname, { root, readFile }) {
  const filePath = resolveStaticFile(pathname, root);
  if (!filePath) {
    return {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: "not found",
    };
  }
  let body;
  try {
    body = readFile(filePath);
  } catch {
    return null;
  }
  return {
    status: 200,
    headers: {
      "content-type": contentTypeFor(filePath),
      "cache-control": "no-store",
    },
    body,
  };
}
