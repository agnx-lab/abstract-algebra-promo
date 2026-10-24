#!/usr/bin/env node
/**
 * 场景：短跑 sidecar — 确保抽象代数宣传片静态站已在 loopback 监听。
 * 用法：node .agnx/tools/ensure-abstract-algebra-promo.mjs [--work-dir <dataRoot>] [--port <n>] [--force-restart]
 * stdout：单行 JSON { ok, port, origin, reused, pid?, warnings? }
 */
import { spawn } from "node:child_process";
import { access, constants as fsConstants, mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const defaultPort = 3097;
const serverScript = path.join(__dirname, "promo-static-server.mjs");

function parseArgs(argv) {
  let workDir = process.env.AGNX_APP_DATA_ROOT || "";
  let port = defaultPort;
  let forceRestart = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if ((arg === "--work-dir" || arg === "--workDir") && next) {
      workDir = String(next).trim();
      i += 1;
    } else if (arg === "--port" && next) {
      const n = Number(next);
      if (Number.isFinite(n) && n > 0) {
        port = n;
      }
      i += 1;
    } else if (arg === "--force-restart" || arg === "--forceRestart") {
      forceRestart = true;
    }
  }
  return {
    workDir: workDir || path.join(repoRoot, ".agnx-aap-runtime"),
    port,
    forceRestart,
  };
}

function fingerprint(cfg) {
  return JSON.stringify({
    repoRoot,
    port: cfg.port,
    server: "promo-static-server",
    entry: "promo.html",
  });
}

async function pathExists(p) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readState(statePath) {
  try {
    const raw = await readFile(statePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeState(statePath, payload) {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function httpGetOk(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitHealthy(origin, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    if (await httpGetOk(origin)) {
      return true;
    }
    await sleep(250);
  }
  return false;
}

function isPidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopPid(pid) {
  if (!isPidAlive(pid)) {
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // ignore
  }
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  const promoHtml = path.join(repoRoot, "promo.html");
  const musicMp3 = path.join(repoRoot, "music.mp3");
  if (!(await pathExists(promoHtml))) {
    emit({ ok: false, error: `缺少 promo.html：${promoHtml}` });
    process.exitCode = 1;
    return;
  }
  if (!(await pathExists(musicMp3))) {
    emit({ ok: false, error: `缺少 music.mp3：${musicMp3}` });
    process.exitCode = 1;
    return;
  }
  if (!(await pathExists(serverScript))) {
    emit({ ok: false, error: `缺少 promo-static-server.mjs：${serverScript}` });
    process.exitCode = 1;
    return;
  }

  await mkdir(cfg.workDir, { recursive: true });
  const statePath = path.join(cfg.workDir, "abstract-algebra-promo.json");
  const origin = `http://127.0.0.1:${cfg.port}/`;
  const fp = fingerprint(cfg);
  const prev = await readState(statePath);

  if (
    !cfg.forceRestart &&
    prev?.ok &&
    prev.fingerprint === fp &&
    isPidAlive(prev.pid) &&
    (await httpGetOk(origin))
  ) {
    emit({
      ok: true,
      port: cfg.port,
      origin,
      reused: true,
      pid: prev.pid,
    });
    return;
  }

  if (prev?.pid) {
    stopPid(prev.pid);
    await sleep(400);
  }

  const child = spawn(process.execPath, [serverScript, String(cfg.port)], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      AAP_PORT: String(cfg.port),
    },
  });
  child.unref();
  const pid = child.pid;

  const healthy = await waitHealthy(origin);
  if (!healthy || !isPidAlive(pid)) {
    if (pid) {
      stopPid(pid);
    }
    emit({
      ok: false,
      port: cfg.port,
      origin,
      error: "静态站未在超时内就绪（promo-static-server）",
      pid,
    });
    process.exitCode = 1;
    return;
  }

  await writeState(statePath, {
    ok: true,
    port: cfg.port,
    origin,
    pid,
    fingerprint: fp,
    startedAt: new Date().toISOString(),
  });

  emit({
    ok: true,
    port: cfg.port,
    origin,
    reused: false,
    pid,
  });
}

main().catch((error) => {
  emit({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
