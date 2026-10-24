#!/usr/bin/env node
/**
 * 场景：抽象代数宣传片静态站 — 由 ensure 拉起；根路径映射 promo.html。
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const port = Number(process.env.AAP_PORT || process.argv[2] || 3097);
const host = "127.0.0.1";
const ENTRY = "promo.html";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = decoded === "/" ? ENTRY : decoded.replace(/^\/+/, "");
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) {
    return null;
  }
  return full;
}

async function serveStatic(req, res) {
  const filePath = safeJoin(repoRoot, req.url || "/");
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    let st = await stat(filePath);
    let finalPath = filePath;
    if (st.isDirectory()) {
      finalPath = path.join(filePath, ENTRY);
      st = await stat(finalPath);
    }
    const data = await readFile(finalPath);
    const ext = path.extname(finalPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control":
        ext === ".html" || ext === ".js" || ext === ".json" ? "no-store" : "public, max-age=3600",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    });
    res.end();
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    await serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end("Method Not Allowed");
});

server.listen(port, host, () => {
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      kind: "promo-static-server",
      port,
      origin: `http://${host}:${port}/`,
      entry: ENTRY,
    })}\n`,
  );
});

server.on("error", (error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
