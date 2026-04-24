"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const FILTERS = [
  "film-grain",
  "cinematic",
  "matte-fade",
  "bw-contrast",
  "soft-glow",
  "canvas-texture",
  "duotone",
  "studio-lighting",
];

function parseArgs(argv) {
  const args = { jobs: 50, image: null, url: "http://localhost:4000" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--jobs") args.jobs = Number(argv[++i]);
    else if (a === "--image") args.image = argv[++i];
    else if (a === "--url") args.url = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        "usage: node stress-test.js --jobs <n> --image <path> [--url http://host:port]",
      );
      process.exit(0);
    }
  }
  return args;
}

function extToMime(p) {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function imageToDataUrl(p) {
  const buf = await fs.readFile(p);
  return `data:${extToMime(p)};base64,${buf.toString("base64")}`;
}

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.image) {
    console.error("error: --image <path> is required");
    process.exit(1);
  }
  const imagePath = path.resolve(args.image);
  try {
    await fs.access(imagePath);
  } catch {
    console.error(`error: image not found at ${imagePath}`);
    process.exit(1);
  }

  console.log(`[stress] converting ${imagePath} → data URL`);
  const imageUrl = await imageToDataUrl(imagePath);
  console.log(
    `[stress] data URL length: ${mb(imageUrl.length)}MB ` +
      `(${imageUrl.length.toLocaleString()} chars)`,
  );

  // Initial health probe for starting memory.
  let startHealth;
  try {
    const r = await fetch(`${args.url}/health`);
    startHealth = await r.json();
  } catch (err) {
    console.error(
      `error: could not reach render worker at ${args.url}/health — is it running?`,
    );
    console.error(err.message);
    process.exit(1);
  }
  if (startHealth.status === "starting") {
    console.error(
      "error: render worker is still starting up; wait until /health reports ready",
    );
    process.exit(1);
  }
  console.log(
    `[stress] server start: rss=${mb(startHealth.memoryUsage.rss)}MB ` +
      `heapUsed=${mb(startHealth.memoryUsage.heapUsed)}MB ` +
      `totalJobsProcessed=${startHealth.totalJobsProcessed}`,
  );

  const results = [];
  const failures = [];
  const totalStart = Date.now();

  for (let i = 0; i < args.jobs; i++) {
    const filterName = FILTERS[i % FILTERS.length];
    const jobId = `stress-${Date.now()}-${i}`;
    const t0 = Date.now();
    try {
      const res = await fetch(`${args.url}/render`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId,
          imageUrl,
          filterName,
          filterParams: {},
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        failures.push({ jobId, filterName, status: res.status, body: text });
        console.error(
          `[stress] job ${i + 1}/${args.jobs} ${filterName} FAILED ` +
            `(${res.status}): ${text.slice(0, 120)}`,
        );
        continue;
      }
      const body = await res.json();
      const durationMs = body.durationMs ?? Date.now() - t0;
      results.push({ jobId, filterName, durationMs });
      console.log(
        `[stress] ${pad(`${i + 1}/${args.jobs}`, 7)} ${pad(filterName, 16)} ` +
          `${pad(`${durationMs}ms`, 8)} rss=${mb(body.memoryUsage.rss)}MB ` +
          `heapUsed=${mb(body.memoryUsage.heapUsed)}MB`,
      );
    } catch (err) {
      failures.push({ jobId, filterName, error: err.message });
      console.error(
        `[stress] job ${i + 1}/${args.jobs} ${filterName} THREW: ${err.message}`,
      );
    }
  }

  const totalMs = Date.now() - totalStart;

  // Final health probe for ending memory.
  let endHealth = null;
  try {
    const r = await fetch(`${args.url}/health`);
    endHealth = await r.json();
  } catch (err) {
    console.error(`[stress] could not fetch final /health: ${err.message}`);
  }

  const durations = results.map((r) => r.durationMs);
  const avg = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  const min = durations.length ? Math.min(...durations) : 0;
  const max = durations.length ? Math.max(...durations) : 0;

  console.log("\n=== Stress test summary ===");
  console.log(`Total jobs requested : ${args.jobs}`);
  console.log(`  succeeded          : ${results.length}`);
  console.log(`  failed             : ${failures.length}`);
  console.log(`Total wall time      : ${totalMs}ms (${(totalMs / 1000).toFixed(2)}s)`);
  console.log(`Average render time  : ${avg.toFixed(1)}ms`);
  console.log(`Min render time      : ${min}ms`);
  console.log(`Max render time      : ${max}ms`);
  console.log(
    `Server rss           : start ${mb(startHealth.memoryUsage.rss)}MB → ` +
      `end ${endHealth ? mb(endHealth.memoryUsage.rss) + "MB" : "n/a"}`,
  );
  console.log(
    `Server heapUsed      : start ${mb(startHealth.memoryUsage.heapUsed)}MB → ` +
      `end ${endHealth ? mb(endHealth.memoryUsage.heapUsed) + "MB" : "n/a"}`,
  );
  if (endHealth) {
    console.log(
      `Server avg (all-time): ${endHealth.averageRenderMs.toFixed(1)}ms ` +
        `over ${endHealth.totalJobsProcessed} jobs`,
    );
  }

  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  ${f.jobId} ${f.filterName} — ${f.error || f.status + ": " + (f.body || "").slice(0, 100)}`);
    }
  }
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error("[stress] fatal:", err);
  process.exit(1);
});
