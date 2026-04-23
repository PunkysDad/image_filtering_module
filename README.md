# Image Filter Platform

POC for a CMS-agnostic image filter SaaS dashboard.

Next.js 14 (App Router) dashboard that applies configurable SVG + Canvas 2D filters to an uploaded image, previews live, and exports a WebP via a Playwright/Sharp pipeline.

## Prerequisites

- Node.js 18.17+ (Node 20 recommended)
- npm

## Install

```bash
npm install
npx playwright install chromium
```

The second command downloads the Chromium build Playwright uses for the export pipeline.

## Run

```bash
npm run dev
```

Open http://localhost:3000.

## How it works

- **Preview and export share one rendering engine.** The engine lives in `public/filters.js` + `public/render.html`. The dashboard embeds `render.html` in an iframe and drives it via `postMessage`. The export pipeline loads the same `render.html` with URL params in a Playwright-controlled Chromium. This guarantees preview and export are pixel-identical.
- **Color transforms** are done via SVG `<filter>` primitives (`feColorMatrix`, `feComponentTransfer`) applied as a `ctx.filter = url(#...)` when the image is drawn to a canvas.
- **Overlay effects** (grain, vignette, bloom, texture, dust, letterbox, radial light, scan lines) are drawn on the same canvas using Canvas 2D. All randomness is seeded (mulberry32) so export output is deterministic.
- **Export** converts the canvas to a PNG (via `canvas.toDataURL`), then Sharp transcodes to WebP and writes it to `/exports/<uuid>.webp`.

## Project layout

```
app/
  page.tsx                     Dashboard UI
  api/upload/route.ts          POST image → /uploads/<uuid>.<ext>
  api/export/route.ts          POST filter job → /exports/<uuid>.webp
  uploads/[file]/route.ts      Serves files from /uploads
  exports/[file]/route.ts      Serves files from /exports
lib/
  filters.ts                   UI control schema (names, sliders, defaults)
  renderer.ts                  Playwright + Sharp export pipeline
public/
  render.html                  Shared renderer shell (iframe + Playwright)
  filters.js                   SVG filter builders + Canvas overlays + seeded PRNG
uploads/                       Source images (runtime, gitignored)
exports/                       WebP output (runtime, gitignored)
```

## Environment variables

None required for local dev. The export pipeline derives its base URL from the incoming request's `Host` header.

## Notes & limitations (POC)

- Exports run one at a time (serial queue in `lib/renderer.ts`); no worker/queue yet.
- Canvas `ctx.filter = url(#...)` is reliable in Chromium (Playwright uses it) but inconsistent in Safari/Firefox. Preview assumes a Chromium-family browser.
- Uploaded files and exports are not garbage-collected.
- Max upload size is 50MB.
