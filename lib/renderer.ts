import path from "node:path";
import fs from "node:fs/promises";
import { chromium, Browser } from "playwright";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const EXPORTS_DIR = path.join(process.cwd(), "exports");

export interface LayerDef {
  preset: string;
  visible: boolean;
  intensity: number;
  params: Record<string, unknown>;
  mask?: unknown;
  curves?: unknown;
}

export interface ExportJob {
  imagePath: string; // public path like "/uploads/<uuid>.jpg"
  format?: "webp" | "jpeg" | "png"; // output encoding; defaults to webp
  exportWidth?: number | null; // optional resize width (px); null = original size
  layers: LayerDef[];
  seed?: number;

  // Optional overlay layer + knockout-text composition.
  overlayImagePath?: string | null;
  overlayPreset?: string | null;
  overlayParams?: Record<string, unknown> | null;
  knockoutText?: string | null;
  textSize?: number;
  textPosition?: { x: number; y: number };
  letterSpacing?: number;
  fontWeight?: number;
  hslAdjustments?: Record<string, { hue: number; saturation: number; luminance: number }> | null;
}

export interface ExportResult {
  downloadUrl: string;
  filePath: string;
  width: number;
  height: number;
}

// Single shared browser instance across exports; lazily launched.
let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).then((b) => {
      b.on("disconnected", () => {
        browserPromise = null;
      });
      return b;
    });
  }
  return browserPromise;
}

// Serial queue: POC processes one export at a time.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

export async function renderToWebp(job: ExportJob): Promise<ExportResult> {
  return enqueue(() => runExport(job));
}

async function runExport(job: ExportJob): Promise<ExportResult> {
  await fs.mkdir(EXPORTS_DIR, { recursive: true });

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  // [TEMP DIAGNOSTIC LOGGING — remove after mask/curves export timeout is diagnosed]
  page.on("console", (m) => console.log("[render console]", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("[render pageerror]", e.message, e.stack));
  // [END TEMP DIAGNOSTIC LOGGING]
  try {
    // The render browser and the Next server run in the same task, so render
    // assets (render.html + the source/overlay images, all served by this
    // process) must be fetched from LOOPBACK — never via a header-derived
    // public origin. In production that public origin is the CloudFront edge,
    // where the source-image GET 403s and the render times out. Locally this
    // is the same localhost:3000 it always was.
    const renderBase = `http://127.0.0.1:${process.env.PORT || "3000"}`;
    const absImageUrl = new URL(job.imagePath, renderBase).toString();
    const url = new URL("/render.html", renderBase);
    url.searchParams.set("image", absImageUrl);
    url.searchParams.set("layers", JSON.stringify(job.layers));
    url.searchParams.set("seed", String(job.seed ?? 1));

    // Resolution cap for the in-browser render canvas (where getImageData /
    // applyMask / applyCurves run). Render no larger than we will deliver:
    //   - explicit export width → render the canvas at that width
    //   - otherwise            → clamp the longest edge to 3000px
    // This bounds the memory of the mask passes and prevents OOM of the render
    // tab on large sources. The final size is decided here, so Sharp's resize
    // below is a no-op for the explicit-width case (canvas is already that
    // width) and is skipped entirely when no width is requested.
    if (job.exportWidth) {
      url.searchParams.set("renderWidth", String(job.exportWidth));
    }
    url.searchParams.set("maxEdge", "3000");

    if (job.hslAdjustments) {
      url.searchParams.set("hsl", JSON.stringify(job.hslAdjustments));
    }

    if (job.overlayImagePath) {
      const absOverlay = new URL(job.overlayImagePath, renderBase).toString();
      url.searchParams.set("overlayImage", absOverlay);
      if (job.overlayPreset) {
        url.searchParams.set("overlayPreset", job.overlayPreset);
      }
      url.searchParams.set(
        "overlayParams",
        JSON.stringify(job.overlayParams ?? {}),
      );
      if (job.knockoutText) {
        url.searchParams.set("knockoutText", job.knockoutText);
      }
      if (typeof job.textSize === "number") {
        url.searchParams.set("textSize", String(job.textSize));
      }
      if (job.textPosition) {
        url.searchParams.set(
          "textPosition",
          JSON.stringify(job.textPosition),
        );
      }
      if (typeof job.letterSpacing === "number") {
        url.searchParams.set("letterSpacing", String(job.letterSpacing));
      }
      if (typeof job.fontWeight === "number") {
        url.searchParams.set("fontWeight", String(job.fontWeight));
      }
    }

    await page.goto(url.toString(), { waitUntil: "load", timeout: 30_000 });
    // Wait for the render to either complete OR self-report an error. The
    // timeout remains a backstop for a tab that dies without running its catch
    // (e.g. an OOM kill).
    // [TEMP DIAGNOSTIC LOGGING — remove after mask/curves export timeout is diagnosed]
    try {
      await page.waitForSelector(
        'body[data-render-complete="true"], body[data-render-error]',
        { timeout: 15_000 },
      );
    } catch (waitErr) {
      const diag = await page
        .evaluate(() => ({
          bodyLen: document.body ? document.body.outerHTML.length : -1,
          renderComplete: document.body?.getAttribute("data-render-complete"),
          renderError: document.body?.getAttribute("data-render-error"),
          windowRenderError: (window as unknown as { renderError?: string }).renderError ?? null,
        }))
        .catch((e) => ({ evalFailed: String(e) }));
      console.log("[render timeout diag]", JSON.stringify(diag));
      throw waitErr;
    }
    // [END TEMP DIAGNOSTIC LOGGING]

    // If the render context reported an error, surface it as a real Error so
    // the server log shows the actual cause instead of a bare timeout.
    const renderError = await page.evaluate(() => {
      if (!document.body || !document.body.hasAttribute("data-render-error")) {
        return null;
      }
      return {
        message: document.body.getAttribute("data-render-error") || "unknown",
        stack: (window as unknown as { renderErrorStack?: string | null }).renderErrorStack ?? null,
      };
    });
    if (renderError) {
      throw new Error(
        `Render failed in browser context: ${renderError.message}` +
          (renderError.stack ? `\n${renderError.stack}` : ""),
      );
    }

    // Resize viewport to the canvas pixel dimensions so nothing is clipped if
    // we ever swap to a page/element screenshot; harmless for the toDataURL
    // path below.
    const canvasSize = await page.evaluate(() => {
      const c = document.getElementById("canvas") as HTMLCanvasElement;
      return { width: c.width, height: c.height };
    });
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      await page.setViewportSize({
        width: canvasSize.width,
        height: canvasSize.height,
      });
    }

    // Safety buffer: let any post-layout paints settle after the viewport
    // resize before we read the canvas pixels.
    await page.waitForTimeout(200);

    const dataUrl: string = await page.evaluate(() => {
      const c = document.getElementById("canvas") as HTMLCanvasElement;
      return c.toDataURL("image/png");
    });

    const base64 = dataUrl.split(",")[1];
    if (!base64) throw new Error("Canvas produced empty data URL");
    const pngBuffer = Buffer.from(base64, "base64");
    const layerSummary = job.layers
      .map((l) => `${l.preset}${l.visible ? "" : "(hidden)"}`)
      .join("+");
    console.log(
      `[renderer] captured PNG ${pngBuffer.byteLength} bytes ` +
        `(${canvasSize.width}x${canvasSize.height}, layers=[${layerSummary}])`,
    );
    if (pngBuffer.byteLength < 10_000) {
      console.warn(
        "[renderer] PNG buffer is under 10kb — canvas was likely blank at capture time",
      );
    }

    const { width, height } = await sharp(pngBuffer).metadata();
    const id = uuidv4();
    const format = job.format ?? "webp";
    const ext = format === "jpeg" ? "jpg" : format; // "webp" | "jpg" | "png"
    const fileName = `${id}.${ext}`;
    const filePath = path.join(EXPORTS_DIR, fileName);
    const encoder = sharp(pngBuffer);
    // The render canvas is already sized to the delivered output (see the
    // renderWidth/maxEdge cap above), so this is not a second downscale:
    //   - explicit width ≤ source → canvas is already that width; resize is a
    //     no-op that just guarantees the exact requested width.
    //   - explicit width > source → the canvas only downscales, so this is the
    //     single upscale-on-encode to the requested width.
    //   - no width → skipped; the capped canvas is the final size.
    if (job.exportWidth) {
      encoder.resize(job.exportWidth);
    }
    if (format === "jpeg") {
      await encoder.jpeg({ quality: 92 }).toFile(filePath);
    } else if (format === "png") {
      await encoder.png().toFile(filePath);
    } else {
      await encoder.webp({ quality: 92 }).toFile(filePath);
    }

    return {
      downloadUrl: `/exports/${fileName}`,
      filePath,
      width: width ?? 0,
      height: height ?? 0,
    };
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}
