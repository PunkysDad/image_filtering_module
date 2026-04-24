"use strict";

const path = require("node:path");
const fs = require("node:fs/promises");
const express = require("express");
const { chromium } = require("playwright");
const sharp = require("sharp");

const PORT = Number(process.env.PORT) || 4000;
const ROOT = __dirname;
const OUTPUT_DIR = path.join(ROOT, "output");

let browser = null;
let context = null;
let page = null;
let isReady = false;
let busy = false;
let totalJobsProcessed = 0;
let totalRenderMs = 0;

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

function logMem(prefix) {
  const m = process.memoryUsage();
  console.log(
    `${prefix} rss=${mb(m.rss)}MB heapUsed=${mb(m.heapUsed)}MB heapTotal=${mb(m.heapTotal)}MB`,
  );
}

async function renderJob({ jobId, imageUrl, filterName, filterParams }) {
  // Clear the completion flag *before* dispatching the render message so
  // waitForSelector can't match stale state from the previous job.
  await page.evaluate(
    (msg) => {
      document.body.removeAttribute("data-render-complete");
      window.postMessage(
        {
          type: "render",
          imageUrl: msg.imageUrl,
          preset: msg.preset,
          params: msg.params,
          seed: msg.seed,
        },
        "*",
      );
    },
    {
      imageUrl,
      preset: filterName,
      params: filterParams || {},
      seed: 1,
    },
  );

  await page.waitForSelector('body[data-render-complete="true"]', {
    timeout: 30_000,
  });

  const dataUrl = await page.evaluate(() => {
    const c = document.getElementById("canvas");
    return c.toDataURL("image/png");
  });
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("canvas produced empty data URL");
  const pngBuffer = Buffer.from(base64, "base64");

  const outputPath = path.join(OUTPUT_DIR, `${jobId}.webp`);
  await sharp(pngBuffer).webp({ quality: 92 }).toFile(outputPath);

  return outputPath;
}

async function start() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  // Serve render.html + filters.js from disk so the <script src="/filters.js">
  // tag in the unmodified render.html resolves.
  app.use(express.static(ROOT, { index: false }));

  app.post("/render", async (req, res) => {
    if (!isReady) return res.status(503).json({ error: "not ready" });
    if (busy) return res.status(429).json({ error: "busy" });

    const { jobId, imageUrl, filterName, filterParams } = req.body || {};
    if (!jobId || !imageUrl || !filterName) {
      return res
        .status(400)
        .json({ error: "jobId, imageUrl, filterName required" });
    }

    busy = true;
    const startTs = Date.now();
    try {
      const outputPath = await renderJob({
        jobId,
        imageUrl,
        filterName,
        filterParams,
      });

      const durationMs = Date.now() - startTs;
      totalJobsProcessed += 1;
      totalRenderMs += durationMs;

      const memoryUsage = process.memoryUsage();
      console.log(
        `[render] jobId=${jobId} filter=${filterName} durationMs=${durationMs} ` +
          `heapUsed=${mb(memoryUsage.heapUsed)}MB rss=${mb(memoryUsage.rss)}MB`,
      );

      res.json({ jobId, outputPath, durationMs, memoryUsage });
    } catch (err) {
      console.error(
        `[render] jobId=${jobId} filter=${filterName} failed: ${err.message}`,
      );
      res.status(500).json({ error: err.message });
    } finally {
      busy = false;
    }
  });

  app.get("/health", (_req, res) => {
    const memoryUsage = process.memoryUsage();
    const averageRenderMs = totalJobsProcessed
      ? totalRenderMs / totalJobsProcessed
      : 0;
    const status = !isReady ? "starting" : busy ? "busy" : "ready";
    res.json({
      status,
      memoryUsage,
      totalJobsProcessed,
      averageRenderMs,
    });
  });

  const server = app.listen(PORT, async () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    logMem("[server] startup");

    try {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        viewport: { width: 1600, height: 1200 },
        deviceScaleFactor: 1,
      });
      page = await context.newPage();
      page.on("pageerror", (err) =>
        console.error("[page.pageerror]", err.message),
      );
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          console.error("[page.console.error]", msg.text());
        }
      });
      await page.goto(`http://localhost:${PORT}/render.html`, {
        waitUntil: "load",
        timeout: 30_000,
      });
      isReady = true;
      console.log("[server] Chromium ready, render.html loaded");
      logMem("[server] after browser launch");
    } catch (err) {
      console.error("[server] failed to initialize Chromium:", err);
      process.exit(1);
    }
  });

  async function shutdown(signal) {
    console.log(`[server] ${signal} received, shutting down`);
    server.close();
    try {
      await page?.close();
    } catch {}
    try {
      await context?.close();
    } catch {}
    try {
      await browser?.close();
    } catch {}
    process.exit(0);
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("[server] fatal:", err);
  process.exit(1);
});
