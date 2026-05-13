// Shared rendering engine.
// Loaded by render.html (both in dashboard iframe and in Playwright for export).
// Exposes window.ImageFilters = { PRESETS, renderScene, hashSeed }.
(function (global) {
  "use strict";

  // ---------- Deterministic PRNG ----------
  function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  // ---------- utils ----------
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pct = (v, def = 0) => (typeof v === "number" ? v : def) / 100;
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    return m
      ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
      : [0, 0, 0];
  }

  // ---------- RGB ↔ HSL (precise) ----------
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
  }

  function _hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      _hue2rgb(p, q, h + 1 / 3) * 255,
      _hue2rgb(p, q, h) * 255,
      _hue2rgb(p, q, h - 1 / 3) * 255,
    ];
  }

  // ---------- HSL channel editor ----------
  // Channel centers and Gaussian sigmas (degrees). Sigma ~ half the distance
  // to adjacent channel so boundaries blend smoothly without hard hue artifacts.
  const HSL_CHANNELS = [
    { key: "reds",     center: 0,   sigma: 10 },
    { key: "oranges",  center: 30,  sigma: 10 },
    { key: "yellows",  center: 60,  sigma: 10 },
    { key: "greens",   center: 120, sigma: 30 },
    { key: "cyans",    center: 180, sigma: 10 },
    { key: "blues",    center: 225, sigma: 20 },
    { key: "magentas", center: 300, sigma: 30 },
  ];

  // Shared Gaussian channel weight for a single named channel.
  // expansion 0–100: 50 = standard channel width, 0 = very narrow, 100 = ~1.8× wider.
  // smoothness 0–100: 50 = plain Gaussian, 100 = softer falloff, 0 = sharper cutoff.
  function getChannelWeight(hue, channelKey, expansion, smoothness) {
    for (let i = 0; i < HSL_CHANNELS.length; i++) {
      const ch = HSL_CHANNELS[i];
      if (ch.key !== channelKey) continue;
      let d = Math.abs(hue - ch.center) % 360;
      if (d > 180) d = 360 - d;
      const effSigma = ch.sigma * (0.2 + 1.6 * (expansion / 100));
      if (effSigma < 1e-6) return d < 0.5 ? 1 : 0;
      const raw = Math.exp(-(d * d) / (2 * effSigma * effSigma));
      const pow = 0.5 + (100 - smoothness) / 100; // 0→1.5, 50→1.0, 100→0.5
      return Math.pow(raw, pow);
    }
    return 0;
  }

  // Global HSL pass: per-channel H/S/L adjustments applied after all filter
  // layers. Gaussian partition-of-unity blending prevents hard boundary edges.
  function applyHSLAdjustments(canvas, hslState) {
    if (!hslState) return;
    const channelKeys = ["reds", "oranges", "yellows", "greens", "cyans", "blues", "magentas"];
    const allZero = channelKeys.every((k) => {
      const ch = hslState[k];
      return !ch || (ch.hue === 0 && ch.saturation === 0 && ch.luminance === 0);
    });
    if (allZero) return;

    const ctx = canvas.getContext("2d");
    const iw = canvas.width;
    const ih = canvas.height;
    const img = ctx.getImageData(0, 0, iw, ih);
    const data = img.data;
    const wBuf = new Float64Array(HSL_CHANNELS.length);

    for (let i = 0; i < data.length; i += 4) {
      const [pixHue, pixSat, pixLum] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      if (pixSat < 0.01) continue; // near-achromatic pixels have no meaningful hue

      let totalW = 0;
      for (let ci = 0; ci < HSL_CHANNELS.length; ci++) {
        const wt = getChannelWeight(pixHue, HSL_CHANNELS[ci].key, 50, 50);
        wBuf[ci] = wt;
        totalW += wt;
      }
      if (totalW < 1e-10) continue;

      let dHue = 0, dSat = 0, dLum = 0;
      for (let ci = 0; ci < HSL_CHANNELS.length; ci++) {
        const adj = hslState[HSL_CHANNELS[ci].key];
        if (!adj) continue;
        const w = wBuf[ci] / totalW;
        dHue += w * adj.hue;
        dSat += w * adj.saturation;
        dLum += w * adj.luminance;
      }

      const newHue = ((pixHue + dHue) % 360 + 360) % 360;
      const newSat = Math.max(0, Math.min(1, pixSat + dSat / 100));
      const newLum = Math.max(0, Math.min(1, pixLum + dLum / 100));
      const [nr, ng, nb] = hslToRgb(newHue, newSat, newLum);
      data[i]     = Math.max(0, Math.min(255, Math.round(nr)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(ng)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(nb)));
    }

    ctx.putImageData(img, 0, 0);
  }

  // Per-layer mask: blends original pixels with effected pixels per-pixel.
  // sourceCanvas = pre-effect canvas; targetCanvas = post-effect canvas (modified in place).
  function applyMask(sourceCanvas, targetCanvas, mask) {
    if (!mask) return;
    const lumCfg = mask.luminosity;
    const colCfg = mask.colorRange;
    const lumActive = lumCfg && lumCfg.enabled;
    const colActive = colCfg && colCfg.enabled && colCfg.channel;
    if (!lumActive && !colActive) return;

    const w = targetCanvas.width;
    const h = targetCanvas.height;

    // Get original pixels (source).
    let origData;
    if (typeof sourceCanvas.getContext === "function") {
      origData = sourceCanvas.getContext("2d").getImageData(0, 0, w, h);
    } else {
      const tmp = makeCanvas(w, h);
      tmp.getContext("2d").drawImage(sourceCanvas, 0, 0, w, h);
      origData = tmp.getContext("2d").getImageData(0, 0, w, h);
    }

    const effCtx = targetCanvas.getContext("2d");
    const effData = effCtx.getImageData(0, 0, w, h);
    const od = origData.data;
    const ed = effData.data;

    for (let i = 0; i < od.length; i += 4) {
      const oR = od[i], oG = od[i + 1], oB = od[i + 2], oA = od[i + 3];
      let lumWeight = 1.0;
      let colorWeight = 1.0;

      if (lumActive) {
        const L = oR * 0.299 + oG * 0.587 + oB * 0.114;
        const mn = lumCfg.min;
        const mx = lumCfg.max;
        const feather = (lumCfg.smoothness / 100) * 64;
        if (feather < 0.5) {
          lumWeight = (L >= mn && L <= mx) ? 1.0 : 0.0;
        } else if (L <= mn - feather) {
          lumWeight = 0;
        } else if (L <= mn) {
          const t = (L - (mn - feather)) / feather;
          lumWeight = t * t * (3 - 2 * t);
        } else if (L <= mx) {
          lumWeight = 1;
        } else if (L <= mx + feather) {
          const t = (L - mx) / feather;
          lumWeight = 1 - t * t * (3 - 2 * t);
        } else {
          lumWeight = 0;
        }
        if (lumCfg.invert) lumWeight = 1 - lumWeight;
      }

      if (colActive) {
        const hsl = rgbToHsl(oR, oG, oB);
        const pixSat = hsl[1];
        if (pixSat < 0.01) {
          colorWeight = 0;
        } else {
          colorWeight = getChannelWeight(hsl[0], colCfg.channel, colCfg.expansion, colCfg.smoothness);
        }
        if (colCfg.invert) colorWeight = 1 - colorWeight;
      }

      const t = lumWeight * colorWeight;
      if (t >= 0.9999) continue; // fast path: full effect, no blend needed
      ed[i]     = Math.round(oR + (ed[i]     - oR) * t);
      ed[i + 1] = Math.round(oG + (ed[i + 1] - oG) * t);
      ed[i + 2] = Math.round(oB + (ed[i + 2] - oB) * t);
      ed[i + 3] = Math.round(oA + (ed[i + 3] - oA) * t);
    }

    effCtx.putImageData(effData, 0, 0);
  }

  // ---------- Per-layer curves ----------

  // Monotonic cubic spline LUT (Fritsch-Carlson method).
  // Returns Uint8Array[256] where LUT[i] = adjusted output for input i,
  // or null when the curve is the identity [[0,0],[255,255]] (no-op).
  function buildCurveLUT(points) {
    if (!points || points.length < 2) return null;
    if (points.length === 2 &&
        points[0][0] === 0 && points[0][1] === 0 &&
        points[1][0] === 255 && points[1][1] === 255) return null;

    const pts = points.slice().sort(function(a, b) { return a[0] - b[0]; });
    const n   = pts.length;
    const xs  = new Float64Array(n);
    const ys  = new Float64Array(n);
    for (let i = 0; i < n; i++) { xs[i] = pts[i][0]; ys[i] = pts[i][1]; }

    const delta = new Float64Array(n - 1);
    for (let k = 0; k < n - 1; k++) {
      const dx = xs[k + 1] - xs[k];
      delta[k] = dx < 1e-10 ? 0 : (ys[k + 1] - ys[k]) / dx;
    }

    const m = new Float64Array(n);
    m[0] = delta[0];
    m[n - 1] = delta[n - 2];
    for (let k = 1; k < n - 1; k++) m[k] = (delta[k - 1] + delta[k]) / 2;
    for (let k = 0; k < n - 1; k++) {
      if (Math.abs(delta[k]) < 1e-10) {
        m[k] = 0; m[k + 1] = 0;
      } else {
        const alpha = m[k] / delta[k];
        const beta  = m[k + 1] / delta[k];
        const s = alpha * alpha + beta * beta;
        if (s > 9) {
          const tau = 3 / Math.sqrt(s);
          m[k]     = tau * alpha * delta[k];
          m[k + 1] = tau * beta  * delta[k];
        }
      }
    }

    const lut = new Uint8Array(256);
    for (let i = 0; i <= 255; i++) {
      let y;
      if (i <= xs[0]) {
        y = ys[0] + m[0] * (i - xs[0]);
      } else if (i >= xs[n - 1]) {
        y = ys[n - 1] + m[n - 1] * (i - xs[n - 1]);
      } else {
        let k = 0;
        while (k < n - 2 && xs[k + 1] <= i) k++;
        const h = xs[k + 1] - xs[k];
        if (h < 1e-10) {
          y = ys[k + 1];
        } else {
          const t = (i - xs[k]) / h;
          const t2 = t * t, t3 = t2 * t;
          y = (2*t3 - 3*t2 + 1) * ys[k]
            + (t3 - 2*t2 + t)   * h * m[k]
            + (-2*t3 + 3*t2)    * ys[k + 1]
            + (t3 - t2)         * h * m[k + 1];
        }
      }
      lut[i] = Math.max(0, Math.min(255, Math.round(y)));
    }
    return lut;
  }

  // Apply per-layer curves: master RGB first, then per-channel R/G/B.
  function applyCurves(canvas, curves) {
    if (!curves) return;
    const rgbLUT = buildCurveLUT(curves.rgb);
    const rLUT   = buildCurveLUT(curves.r);
    const gLUT   = buildCurveLUT(curves.g);
    const bLUT   = buildCurveLUT(curves.b);
    if (!rgbLUT && !rLUT && !gLUT && !bLUT) return;

    const ctx  = canvas.getContext("2d");
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      if (rgbLUT) { r = rgbLUT[r]; g = rgbLUT[g]; b = rgbLUT[b]; }
      if (rLUT) r = rLUT[r];
      if (gLUT) g = gLUT[g];
      if (bLUT) b = bLUT[b];
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
  }

  function rampTable(from, to) {
    return `${from.toFixed(4)} ${to.toFixed(4)}`;
  }
  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // ---------- Canvas overlay primitives ----------

  // Vignette with smoothstep falloff and oval/circular shape.
  //   shape='oval'     → outer radius reaches image corners (darkens corners).
  //   shape='circular' → outer radius = min(w,h)/2 (short edges fade, corners clip).
  function drawVignette(ctx, w, h, amount, softness = 0.5, shape = "oval") {
    if (amount <= 0) return;
    const cx = w / 2;
    const cy = h / 2;
    const outer =
      shape === "circular" ? Math.min(w, h) / 2 : Math.hypot(w, h) / 2;
    const inner = outer * (0.15 + softness * 0.35);
    const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    // Smoothstep(t) = t^2 * (3 - 2t); sampled at t=0,.25,.5,.75,1.
    const stops = [
      [0.0, 0.0],
      [0.25, 0.15625],
      [0.5, 0.5],
      [0.75, 0.84375],
      [1.0, 1.0],
    ];
    for (const [t, s] of stops) {
      g.addColorStop(t, `rgba(0,0,0,${(s * amount).toFixed(4)})`);
    }
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Luma-coupled film grain with per-channel (chroma) noise, tile jitter, and
  // small per-tile rotation to break visible tiling at large image sizes.
  function drawLumaCoupledGrain(ctx, w, h, amount, grainSize, seed) {
    if (amount <= 0) return;
    const scales = { fine: 1, medium: 2, coarse: 4 };
    const scale = scales[grainSize] || 2;
    const tileSize = 128;
    const blockSize = tileSize * scale;

    // Three decorrelated monochrome noise tiles (one per RGB channel) as flat
    // Uint8Arrays. Kept off-canvas for speed — we sample them directly.
    const tiles = [new Uint8Array(tileSize * tileSize)];
    tiles.push(new Uint8Array(tileSize * tileSize));
    tiles.push(new Uint8Array(tileSize * tileSize));
    const rngs = [
      mulberry32((seed ^ 0xa1b2c3d4) >>> 0),
      mulberry32((seed ^ 0x5a5a5aa5) >>> 0),
      mulberry32((seed ^ 0xcc33cc33) >>> 0),
    ];
    for (let ch = 0; ch < 3; ch++) {
      const t = tiles[ch];
      const r = rngs[ch];
      for (let i = 0; i < t.length; i++) t[i] = (r() * 256) | 0;
    }

    // Per-block jitter (offset + small rotation) so adjacent tile repeats don't
    // line up. Block = tileSize * scale in image space.
    const blocksX = Math.ceil(w / blockSize) + 1;
    const blocksY = Math.ceil(h / blockSize) + 1;
    const jrng = mulberry32((seed ^ 0xbadcafe1) >>> 0);
    const jit = new Array(blocksX * blocksY);
    for (let i = 0; i < jit.length; i++) {
      const ox = (jrng() * tileSize) | 0;
      const oy = (jrng() * tileSize) | 0;
      const rot = (jrng() - 0.5) * 0.35; // radians, small
      jit[i] = { ox, oy, cos: Math.cos(rot), sin: Math.sin(rot) };
    }

    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const K = amount * 0.32; // overall strength
    const halfBlock = blockSize / 2;

    for (let y = 0; y < h; y++) {
      const by = (y / blockSize) | 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const bx = (x / blockSize) | 0;
        const j = jit[by * blocksX + bx];
        // Rotate local coords around block center, then sample the tile.
        const lx = x - bx * blockSize - halfBlock;
        const ly = y - by * blockSize - halfBlock;
        const rx = lx * j.cos - ly * j.sin + halfBlock;
        const ry = lx * j.sin + ly * j.cos + halfBlock;
        const tx = ((((rx / scale) | 0) + j.ox) % tileSize + tileSize) % tileSize;
        const ty = ((((ry / scale) | 0) + j.oy) % tileSize + tileSize) % tileSize;
        const tidx = ty * tileSize + tx;

        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        // Peaks in midtones (lum~0.5); falls off in shadows (<0.1) and highlights (>0.9).
        const coupling = Math.max(0, Math.min(1, 1 - Math.abs(lum - 0.5) * 1.6));
        const k = K * coupling;

        const nR = (tiles[0][tidx] - 128) / 128;
        const nG = (tiles[1][tidx] - 128) / 128;
        const nB = (tiles[2][tidx] - 128) / 128;

        data[i]     = Math.max(0, Math.min(255, r + nR * 255 * k));
        data[i + 1] = Math.max(0, Math.min(255, g + nG * 255 * k));
        data[i + 2] = Math.max(0, Math.min(255, b + nB * 255 * k));
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // Downsampled bloom: extract highlights at 1/4 res, two blur passes, upsample + screen.
  function drawGaussianBloom(ctx, w, h, amount, threshold, _seed) {
    if (amount <= 0) return;
    const dw = Math.max(8, Math.floor(w / 4));
    const dh = Math.max(8, Math.floor(h / 4));

    const qres = makeCanvas(dw, dh);
    const qctx = qres.getContext("2d");
    qctx.drawImage(ctx.canvas, 0, 0, dw, dh);

    const img = qctx.getImageData(0, 0, dw, dh);
    const t = clamp(threshold, 0, 0.99);
    for (let i = 0; i < img.data.length; i += 4) {
      const r = img.data[i] / 255;
      const g = img.data[i + 1] / 255;
      const b = img.data[i + 2] / 255;
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const keep = Math.max(0, lum - t) / (1 - t);
      img.data[i]     = img.data[i] * keep;
      img.data[i + 1] = img.data[i + 1] * keep;
      img.data[i + 2] = img.data[i + 2] * keep;
      img.data[i + 3] = 255;
    }
    qctx.putImageData(img, 0, 0);

    // Two blur passes (approximation of separable Gaussian).
    const blurR = Math.max(2, Math.round((Math.min(w, h) * 0.03) / 4));
    const pass1 = makeCanvas(dw, dh);
    const p1 = pass1.getContext("2d");
    p1.filter = `blur(${blurR}px)`;
    p1.drawImage(qres, 0, 0);
    p1.filter = "none";
    const pass2 = makeCanvas(dw, dh);
    const p2 = pass2.getContext("2d");
    p2.filter = `blur(${blurR}px)`;
    p2.drawImage(pass1, 0, 0);
    p2.filter = "none";

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = clamp(amount, 0, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(pass2, 0, 0, dw, dh, 0, 0, w, h);
    ctx.restore();
  }

  // Warm halation around highlights (film-grain preset).
  function drawHalation(ctx, w, h, amount, _seed) {
    if (amount <= 0) return;
    const dw = Math.max(8, Math.floor(w / 4));
    const dh = Math.max(8, Math.floor(h / 4));
    const qres = makeCanvas(dw, dh);
    const qctx = qres.getContext("2d");
    qctx.drawImage(ctx.canvas, 0, 0, dw, dh);
    const img = qctx.getImageData(0, 0, dw, dh);
    const t = 0.85;
    for (let i = 0; i < img.data.length; i += 4) {
      const r = img.data[i] / 255;
      const g = img.data[i + 1] / 255;
      const b = img.data[i + 2] / 255;
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const keep = Math.max(0, lum - t) / (1 - t);
      img.data[i]     = 255 * keep;
      img.data[i + 1] = 200 * keep;
      img.data[i + 2] = 150 * keep;
      img.data[i + 3] = 255;
    }
    qctx.putImageData(img, 0, 0);

    const blurR = Math.max(2, Math.round((Math.min(w, h) * 0.02) / 4));
    const blurred = makeCanvas(dw, dh);
    const bctx = blurred.getContext("2d");
    bctx.filter = `blur(${blurR}px)`;
    bctx.drawImage(qres, 0, 0);
    bctx.filter = "none";

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = clamp(amount, 0, 1);
    ctx.drawImage(blurred, 0, 0, dw, dh, 0, 0, w, h);
    ctx.restore();
  }

  // Anamorphic horizontal streaks at bright highlight centroids (cinematic).
  function drawAnamorphicStreaks(ctx, w, h, amount, seed) {
    if (amount <= 0) return;
    const dw = Math.max(8, Math.floor(w / 4));
    const dh = Math.max(8, Math.floor(h / 4));
    const qres = makeCanvas(dw, dh);
    const qctx = qres.getContext("2d");
    qctx.drawImage(ctx.canvas, 0, 0, dw, dh);
    const data = qctx.getImageData(0, 0, dw, dh).data;

    const candidates = [];
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const i = (y * dw + x) * 4;
        const lum =
          (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        if (lum > 0.88) candidates.push({ x: x * 4, y: y * 4, lum });
      }
    }
    candidates.sort((a, b) => b.lum - a.lum);
    const minDist = w * 0.08;
    const picks = [];
    for (const c of candidates) {
      if (picks.length >= 8) break;
      let ok = true;
      for (const p of picks) {
        if (Math.hypot(c.x - p.x, c.y - p.y) < minDist) {
          ok = false;
          break;
        }
      }
      if (ok) picks.push(c);
    }

    const rng = mulberry32((seed ^ 0xabcd1234) >>> 0);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const p of picks) {
      const peakAlpha = (0.15 + rng() * 0.15) * clamp(amount, 0, 1);
      const streakH = 1 + Math.floor(rng() * 3); // 1–3 px center height
      const sigma = streakH * 1.0 + 0.5;
      const rows = Math.ceil(sigma * 3);
      for (let dy = -rows; dy <= rows; dy++) {
        const gauss = Math.exp(-(dy * dy) / (2 * sigma * sigma));
        const alpha = peakAlpha * gauss;
        if (alpha < 0.002) continue;
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, "rgba(200,220,255,0)");
        g.addColorStop(0.5, `rgba(200,220,255,${alpha.toFixed(4)})`);
        g.addColorStop(1, "rgba(200,220,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, p.y + dy, w, 1);
      }
    }
    ctx.restore();
  }

  // 2.39:1 hard letterbox bars scaled from the actual image aspect.
  function drawLetterbox(ctx, w, h, targetAspect = 2.39) {
    const barH = Math.max(0, (h - w / targetAspect) / 2);
    if (barH <= 0) return;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, Math.ceil(barH));
    ctx.fillRect(0, h - Math.ceil(barH), w, Math.ceil(barH));
    ctx.restore();
  }

  // Dust and scratches: soft-edged spots (exp size distribution, 15% dark),
  // long vertical gate scratches with brightness falloff, a few diagonals.
  function drawDustAndScratches(ctx, w, h, amount, seed) {
    if (amount <= 0) return;
    const rng = mulberry32((seed ^ 0xd5d5d500) >>> 0);
    const density = Math.floor(w * h * 0.00012 * amount);

    ctx.save();
    for (let i = 0; i < density; i++) {
      const x = rng() * w;
      const y = rng() * h;
      // Exponential size: most tiny, rare large.
      const u = rng();
      const size = clamp(-Math.log(u + 1e-4) * 1.0, 0.3, 15);
      const opacity = 0.05 + rng() * 0.35;
      const dark = rng() < 0.15;
      const [cr, cg, cb, ca] = dark
        ? [20, 20, 20, opacity * 0.3]
        : [240, 240, 235, opacity];

      const grd = ctx.createRadialGradient(x, y, 0, x, y, size);
      grd.addColorStop(0, `rgba(${cr},${cg},${cb},${ca.toFixed(4)})`);
      grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.globalCompositeOperation = dark ? "darken" : "lighten";
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Long vertical gate scratches.
    const vertCount = Math.floor(amount * 18);
    ctx.save();
    ctx.globalCompositeOperation = "lighten";
    for (let i = 0; i < vertCount; i++) {
      const x = rng() * w;
      const y0 = rng() * h * 0.2;
      const len = h * (0.3 + rng() * 0.65);
      const y1 = Math.min(h, y0 + len);
      const lw = 0.3 + rng() * 0.5;
      const steps = 24;
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps;
        const t1 = (s + 1) / steps;
        // Sin window → brighter in the middle, fades to either end.
        const a = 0.28 * Math.sin(Math.PI * (t0 + t1) / 2);
        if (a <= 0.001) continue;
        ctx.strokeStyle = `rgba(255,255,250,${a.toFixed(4)})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x + (rng() - 0.5) * 0.6, y0 + (y1 - y0) * t0);
        ctx.lineTo(x + (rng() - 0.5) * 0.6, y0 + (y1 - y0) * t1);
        ctx.stroke();
      }
    }
    // A few short diagonals.
    const diagCount = Math.floor(amount * 6);
    for (let i = 0; i < diagCount; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = 30 + rng() * 80;
      const angle = (rng() - 0.5) * 0.5 + (rng() < 0.5 ? 0 : Math.PI);
      ctx.strokeStyle = `rgba(255,255,250,${(0.1 + rng() * 0.15).toFixed(4)})`;
      ctx.lineWidth = 0.3 + rng() * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Warm edge light leak (matte-fade). Random side chosen from seed.
  function drawLightLeak(ctx, w, h, amount, seed) {
    if (amount <= 0) return;
    const rng = mulberry32((seed ^ 0x1eadb11e) >>> 0);
    const leftEdge = rng() < 0.5;
    const leakW = w * 0.25;
    const peak = (0.05 + rng() * 0.1) * clamp(amount, 0, 1);
    const g = leftEdge
      ? ctx.createLinearGradient(0, 0, leakW, 0)
      : ctx.createLinearGradient(w, 0, w - leakW, 0);
    g.addColorStop(0, `rgba(255,180,80,${peak.toFixed(4)})`);
    g.addColorStop(1, "rgba(255,180,80,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Orton glow: blurred copy of the canvas screen-blended back, warm-tinted.
  function drawOrtonGlow(ctx, w, h, amount, glowRadius) {
    if (amount <= 0) return;
    const src = makeCanvas(w, h);
    src.getContext("2d").drawImage(ctx.canvas, 0, 0);
    const blur = makeCanvas(w, h);
    const bctx = blur.getContext("2d");
    const blurR = Math.max(4, Math.min(w, h) * 0.025 + glowRadius * 0.04);
    bctx.filter = `blur(${blurR}px)`;
    bctx.drawImage(src, 0, 0);
    bctx.filter = "none";
    // Warm-tint the blurred layer before screen-blending back.
    bctx.globalCompositeOperation = "multiply";
    bctx.fillStyle = "rgb(255,240,210)";
    bctx.fillRect(0, 0, w, h);
    bctx.globalCompositeOperation = "source-over";

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = clamp(0.3 + 0.4 * amount, 0, 1);
    ctx.drawImage(blur, 0, 0);
    ctx.restore();
  }

  // Channel mixer B&W conversion. Turns RGB into a single luminance via
  // physical-filter weights (or neutral). Canvas ends up grayscale.
  const CHANNEL_MIX_WEIGHTS = {
    neutral: [1 / 3, 1 / 3, 1 / 3],
    redFilter: [1.4, 0.8, 0.5], // darkens sky, brightens skin
    greenFilter: [0.7, 1.4, 0.7], // landscape look
    blueFilter: [0.5, 0.7, 1.6], // brightens sky, darkens skin
  };
  function applyChannelMix(ctx, w, h, mode) {
    const weights = CHANNEL_MIX_WEIGHTS[mode] || CHANNEL_MIX_WEIGHTS.neutral;
    const wr = weights[0], wg = weights[1], wb = weights[2];
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.max(
        0,
        Math.min(255, d[i] * wr + d[i + 1] * wg + d[i + 2] * wb),
      );
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
  }

  // Split-tone: two color washes using "color" composite so they tint a
  // grayscale canvas while preserving luminance.
  function drawSplitTone(ctx, w, h, shadowHex, highlightHex, amount) {
    if (amount <= 0) return;
    const cx = w / 2, cy = h / 2;
    const outer = Math.hypot(w, h) / 2;
    const sRGB = hexToRgb(shadowHex);
    const hRGB = hexToRgb(highlightHex);

    ctx.save();
    ctx.globalCompositeOperation = "color";
    const shadowG = ctx.createRadialGradient(
      cx, cy, outer * 0.4,
      cx, cy, outer,
    );
    shadowG.addColorStop(0, `rgba(${sRGB[0]},${sRGB[1]},${sRGB[2]},0)`);
    shadowG.addColorStop(
      1,
      `rgba(${sRGB[0]},${sRGB[1]},${sRGB[2]},${(0.15 * amount).toFixed(4)})`,
    );
    ctx.fillStyle = shadowG;
    ctx.fillRect(0, 0, w, h);

    const highlightG = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer * 0.6);
    highlightG.addColorStop(
      0,
      `rgba(${hRGB[0]},${hRGB[1]},${hRGB[2]},${(0.15 * amount).toFixed(4)})`,
    );
    highlightG.addColorStop(1, `rgba(${hRGB[0]},${hRGB[1]},${hRGB[2]},0)`);
    ctx.fillStyle = highlightG;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Studio-lighting key light: 5-stop radial approximating smoothstep / 1/r².
  function drawRadialLight(ctx, w, h, cxPct, cyPct, radiusPct, intensity) {
    if (intensity <= 0) return;
    const cx = (cxPct / 100) * w;
    const cy = (cyPct / 100) * h;
    const radius = Math.max(1, (radiusPct / 100) * Math.hypot(w, h));
    const I = clamp(intensity, 0, 1);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0.0, `rgba(255,245,225,${I.toFixed(4)})`);
    g.addColorStop(0.3, `rgba(255,245,225,${(I * 0.7).toFixed(4)})`);
    g.addColorStop(0.6, `rgba(255,245,225,${(I * 0.3).toFixed(4)})`);
    g.addColorStop(0.85, `rgba(255,245,225,${(I * 0.05).toFixed(4)})`);
    g.addColorStop(1.0, "rgba(255,245,225,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Cool fill light opposite the key position.
  function drawFillLight(ctx, w, h, keyCxPct, keyCyPct, intensity) {
    if (intensity <= 0) return;
    const cx = ((100 - keyCxPct) / 100) * w;
    const cy = ((100 - keyCyPct) / 100) * h;
    const radius = Math.hypot(w, h) * 0.6;
    const I = clamp(intensity * 0.15, 0, 1);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, `rgba(180,200,255,${I.toFixed(4)})`);
    g.addColorStop(1, "rgba(180,200,255,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Thin rim on the edge opposite the key light.
  function drawRimLight(ctx, w, h, keyCxPct, intensity) {
    if (intensity <= 0) return;
    const keyOnLeft = keyCxPct < 50;
    const bandW = w * 0.15;
    const I = clamp(intensity * 0.2, 0, 1);
    const g = keyOnLeft
      ? ctx.createLinearGradient(w - bandW, 0, w, 0)
      : ctx.createLinearGradient(bandW, 0, 0, 0);
    g.addColorStop(0, "rgba(255,255,240,0)");
    g.addColorStop(1, `rgba(255,255,240,${I.toFixed(4)})`);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Per-channel registration offset (duotone print / risograph look). Isolates
  // each channel with a "multiply" wash, then re-composites with "lighter"
  // (additive) at small offsets.
  function drawRegistrationOffset(ctx, w, h, seed) {
    const rng = mulberry32((seed ^ 0x0ff5e701) >>> 0);
    const rx = 1 + Math.round(rng());
    const bx = -(1 + Math.round(rng()));
    const ry = -(1 + Math.round(rng()));
    const by = 1 + Math.round(rng());

    const orig = makeCanvas(w, h);
    orig.getContext("2d").drawImage(ctx.canvas, 0, 0);
    const channelOnly = (rgb) => {
      const c = makeCanvas(w, h);
      const cx = c.getContext("2d");
      cx.drawImage(orig, 0, 0);
      cx.globalCompositeOperation = "multiply";
      cx.fillStyle = rgb;
      cx.fillRect(0, 0, w, h);
      return c;
    };
    const rOnly = channelOnly("rgb(255,0,0)");
    const gOnly = channelOnly("rgb(0,255,0)");
    const bOnly = channelOnly("rgb(0,0,255)");

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(rOnly, rx, ry);
    ctx.drawImage(gOnly, 0, 0);
    ctx.drawImage(bOnly, bx, by);
    ctx.restore();
  }

  // ---------- LUT generators (WebGL pro presets) ----------
  // Each generator maps normalized input RGB [0,1] → normalized output RGB.
  // buildLut() evaluates them across a 32³ grid and returns a tightly packed
  // Float32Array of length 32*32*32*3 (R, G, B triples) that the WebGL layer
  // uploads as a 256×128 2D atlas (8 z-slices per row, 4 rows).

  const LUT_SIZE = 32;
  const _clampUnit = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  function _luma(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }
  function _sat(r, g, b, s) {
    const l = _luma(r, g, b);
    return [l + (r - l) * s, l + (g - l) * s, l + (b - l) * s];
  }
  function _toe(x, strength) {
    // Lift shadows by lerping toward a sqrt curve.
    return x * (1 - strength) + Math.sqrt(Math.max(0, x)) * strength;
  }
  function _shoulder(x, strength) {
    // Compress highlights by lerping toward a 1 - (1-x)^2 curve.
    const s = 1 - (1 - _clampUnit(x)) * (1 - _clampUnit(x));
    return x * (1 - strength) + s * strength;
  }
  function _sCurve(x, amount) {
    // Normalized sigmoid on [0,1]. amount≈1 → gentle; 1.6 → strong.
    const k = 6 * amount;
    const raw = 1 / (1 + Math.exp(-(x - 0.5) * k));
    const r0 = 1 / (1 + Math.exp(0.5 * k));
    const r1 = 1 / (1 + Math.exp(-0.5 * k));
    return (raw - r0) / (r1 - r0);
  }

  function buildLut(transform) {
    const size = LUT_SIZE;
    const out = new Float32Array(size * size * size * 3);
    const denom = size - 1;
    let i = 0;
    for (let bi = 0; bi < size; bi++) {
      const nb = bi / denom;
      for (let gi = 0; gi < size; gi++) {
        const ng = gi / denom;
        for (let ri = 0; ri < size; ri++) {
          const nr = ri / denom;
          const rgb = transform(nr, ng, nb);
          out[i++] = _clampUnit(rgb[0]);
          out[i++] = _clampUnit(rgb[1]);
          out[i++] = _clampUnit(rgb[2]);
        }
      }
    }
    return out;
  }

  // Kodak 2383 Print — warm shadows, desaturated mids, compressed warm highs.
  function lutKodak2383(r, g, b) {
    r = _toe(r, 0.08);
    g = _toe(g, 0.06);
    b = _toe(b, 0.04);
    r = _shoulder(r, 0.20);
    g = _shoulder(g, 0.18);
    b = _shoulder(b, 0.22);
    const l = _luma(r, g, b);
    const shadowMix = 1 - l;
    const highMix = l;
    r += shadowMix * 0.03 + highMix * 0.02;
    g += shadowMix * 0.01;
    b -= shadowMix * 0.015 + highMix * 0.03;
    [r, g, b] = _sat(r, g, b, 0.92);
    return [r, g, b];
  }

  // Bleach Bypass — desaturated 40%, strong S-curve, cool mids, retained highs.
  function lutBleachBypass(r, g, b) {
    r = _sCurve(r, 1.6);
    g = _sCurve(g, 1.6);
    b = _sCurve(b, 1.6);
    [r, g, b] = _sat(r, g, b, 0.6);
    const l = _luma(r, g, b);
    const mid = 1 - Math.abs(l - 0.5) * 2;
    r -= mid * 0.02;
    b += mid * 0.03;
    return [r, g, b];
  }

  // Teal Orange Pro — strong teal in lows, strong orange in highs.
  function lutTealOrangePro(r, g, b) {
    const l = _luma(r, g, b);
    const shad = Math.max(0, 1 - l * 1.5);
    const high = Math.max(0, l * 1.5 - 0.5);
    r += -shad * 0.15 + high * 0.20;
    g += shad * 0.02 + high * 0.05;
    b += shad * 0.15 - high * 0.25;
    [r, g, b] = _sat(r, g, b, 1.05);
    return [r, g, b];
  }

  // Fuji 3510 — cool slightly green mids, lifted shadows, soft highlight roll-off,
  // slight magenta in deep shadows.
  function lutFuji3510(r, g, b) {
    r = _toe(r, 0.12);
    g = _toe(g, 0.10);
    b = _toe(b, 0.08);
    r = _shoulder(r, 0.22);
    g = _shoulder(g, 0.22);
    b = _shoulder(b, 0.18);
    const l = _luma(r, g, b);
    const mid = 1 - Math.abs(l - 0.5) * 2;
    r -= mid * 0.02;
    g += mid * 0.02;
    b += mid * 0.015;
    const deep = Math.max(0, 1 - l * 2);
    r += deep * 0.03;
    g -= deep * 0.02;
    b += deep * 0.03;
    [r, g, b] = _sat(r, g, b, 0.97);
    return [r, g, b];
  }

  // Cool Fade — lifted matte base, cool cast across tones, reduced sat in highs.
  function lutCoolFade(r, g, b) {
    r = _toe(r, 0.25);
    g = _toe(g, 0.25);
    b = _toe(b, 0.22);
    r = _shoulder(r, 0.08);
    g = _shoulder(g, 0.08);
    b = _shoulder(b, 0.08);
    r -= 0.015;
    b += 0.025;
    [r, g, b] = _sat(r, g, b, 0.75);
    const l = _luma(r, g, b);
    const highMix = Math.min(1, l * 1.5);
    r = r + (l - r) * highMix * 0.3;
    g = g + (l - g) * highMix * 0.3;
    b = b + (l - b) * highMix * 0.3;
    return [r, g, b];
  }

  // Warm Print — warm across all tones, lifted shadows, saturated mids, compressed warm highs.
  function lutWarmPrint(r, g, b) {
    r = _toe(r, 0.10);
    g = _toe(g, 0.08);
    b = _toe(b, 0.06);
    r = _shoulder(r, 0.18);
    g = _shoulder(g, 0.20);
    b = _shoulder(b, 0.24);
    r += 0.03;
    b -= 0.03;
    const l = _luma(r, g, b);
    const midBoost = 1 - Math.abs(l - 0.5) * 1.6;
    [r, g, b] = _sat(r, g, b, 1 + midBoost * 0.15);
    return [r, g, b];
  }

  // Cached LUT data — expensive to build, identical across calls.
  const _lutCache = Object.create(null);
  function cachedLut(key, transform) {
    if (!_lutCache[key]) _lutCache[key] = buildLut(transform);
    return _lutCache[key];
  }

  // ---------- Presets ----------
  const PRESETS = {
    "film-grain": {
      buildSvg(p) {
        const I = pct(p.intensity, 70);
        const sat = (1 - 0.2 * I).toFixed(3);
        const slope = (1 + 0.15 * I).toFixed(3);
        const inter = (-0.07 * I).toFixed(3);
        return `
          <feColorMatrix type="saturate" values="${sat}"/>
          <feComponentTransfer>
            <feFuncR type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncG type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncB type="linear" slope="${slope}" intercept="${inter}"/>
          </feComponentTransfer>`;
      },
      drawOverlay(ctx, p, info) {
        const { width: w, height: h, seed } = info;
        const I = pct(p.intensity, 70);
        drawHalation(ctx, w, h, I * 0.7, seed);
        drawLumaCoupledGrain(ctx, w, h, I * 0.9, p.grainSize || "medium", seed);
        drawVignette(ctx, w, h, pct(p.vignetteStrength, 40) * 0.9, 0.45);
      },
    },

    cinematic: {
      buildSvg(p) {
        const I = pct(p.intensity, 70);
        const T = pct(p.tealOrangeStrength, 65);
        const rShadow = (0.0 + (1 - I) * 0.2).toFixed(3);
        const rHigh = (1.0 + 0.05 * I * T).toFixed(3);
        const gShadow = (0.08 * (1 - T * 0.5)).toFixed(3);
        const gHigh = (0.95 + 0.03 * I).toFixed(3);
        const bShadow = (0.18 + 0.12 * T).toFixed(3);
        const bHigh = (0.55 + (1 - T) * 0.4).toFixed(3);
        const sat = (0.92 - 0.12 * I).toFixed(3);
        return `
          <feColorMatrix type="saturate" values="${sat}"/>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="${rShadow} ${(+rShadow + +rHigh) / 2} ${rHigh}"/>
            <feFuncG type="table" tableValues="${gShadow} ${(+gShadow + +gHigh) / 2} ${gHigh}"/>
            <feFuncB type="table" tableValues="${bShadow} ${(+bShadow + +bHigh) / 2} ${bHigh}"/>
          </feComponentTransfer>`;
      },
      drawOverlay(ctx, p, info) {
        const { width: w, height: h, seed } = info;
        const I = pct(p.intensity, 70);
        const bloom = pct(p.bloomAmount, 35);
        drawGaussianBloom(ctx, w, h, bloom * 0.8, 0.62, seed);
        drawAnamorphicStreaks(ctx, w, h, bloom * 0.9, seed);
        drawLumaCoupledGrain(ctx, w, h, I * 0.3, "fine", seed);
        drawVignette(ctx, w, h, 0.35 + I * 0.15, 0.4);
        if (p.letterbox) drawLetterbox(ctx, w, h, 2.39);
      },
    },

    "matte-fade": {
      buildSvg(p) {
        const I = pct(p.intensity, 70);
        const F = pct(p.fadeAmount, 55);
        const C = pct(p.coolShift, 40);
        const floor = (F * 0.28).toFixed(3);
        const slope = (1 - 0.22 * I - F * 0.12).toFixed(3);
        const inter = floor;
        return `
          <feColorMatrix type="matrix" values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 ${(C * 0.05).toFixed(3)}
            0 0 0 1 0"/>
          <feComponentTransfer>
            <feFuncR type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncG type="linear" slope="${slope}" intercept="${(F * 0.28).toFixed(3)}"/>
            <feFuncB type="linear" slope="${slope}" intercept="${(+inter + C * 0.04).toFixed(3)}"/>
          </feComponentTransfer>`;
      },
      drawOverlay(ctx, p, info) {
        const { width: w, height: h, seed } = info;
        const I = pct(p.intensity, 70);
        drawDustAndScratches(ctx, w, h, I * 0.7, seed);
        drawLightLeak(ctx, w, h, I * 0.8, seed);
        drawVignette(ctx, w, h, 0.25, 0.55);
      },
    },

    "bw-contrast": {
      // NOTE: `feColorMatrix saturate` is intentionally removed here; the
      // channel-mixer step in drawOverlay needs the original RGB channels in
      // order to simulate colored B&W filters (red/green/blue). It produces
      // the final grayscale output. The S-curve below handles contrast.
      buildSvg(p) {
        const C = pct(p.contrast, 70);
        const sStops = [0, 0.05, 0.15, 0.35, 0.65, 0.85, 0.95, 1];
        const lerped = sStops
          .map((s, i) => {
            const linear = i / 7;
            return linear * (1 - C) + s * C;
          })
          .map((v) => v.toFixed(4))
          .join(" ");
        return `
          <feComponentTransfer>
            <feFuncR type="table" tableValues="${lerped}"/>
            <feFuncG type="table" tableValues="${lerped}"/>
            <feFuncB type="table" tableValues="${lerped}"/>
          </feComponentTransfer>`;
      },
      drawOverlay(ctx, p, info) {
        const { width: w, height: h, seed } = info;
        applyChannelMix(ctx, w, h, p.channelMix || "neutral");
        drawLumaCoupledGrain(ctx, w, h, pct(p.grainAmount, 50) * 0.9, "medium", seed);
        drawSplitTone(
          ctx,
          w,
          h,
          p.shadowTone || "#1a1a26",
          p.highlightTone || "#f5ecd9",
          1.0,
        );
        drawVignette(ctx, w, h, 0.45, 0.4);
      },
    },

    "soft-glow": {
      buildSvg(p) {
        const W = pct(p.warmth, 50);
        return `
          <feColorMatrix type="matrix" values="
            ${(1 + 0.06 * W).toFixed(3)} 0 0 0 ${(0.02 * W).toFixed(3)}
            0 ${(1 + 0.02 * W).toFixed(3)} 0 0 0
            0 0 ${(1 - 0.05 * W).toFixed(3)} 0 0
            0 0 0 1 0"/>
          <feColorMatrix type="saturate" values="1.1"/>`;
      },
      drawOverlay(ctx, p, info) {
        const { width: w, height: h } = info;
        const I = pct(p.intensity, 70);
        const radius = pct(p.glowRadius, 60);
        const threshold = clamp(1 - pct(p.bloomThreshold, 55) * 0.6, 0.15, 0.9);
        drawOrtonGlow(ctx, w, h, I, radius);
        drawGaussianBloom(ctx, w, h, I * 0.5, threshold, info.seed);
        drawVignette(ctx, w, h, 0.2, 0.6);
      },
    },

    duotone: {
      buildSvg(p) {
        const [sr, sg, sb] = hexToRgb(p.shadowColor || "#1a2a6c");
        const [hr, hg, hb] = hexToRgb(p.highlightColor || "#ffcc66");
        const I = pct(p.intensity, 90);
        const mixStart = (c) => c / 255;
        const mixEnd = (c) => c / 255;
        return `
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="${rampTable(mixStart(sr), mixEnd(hr))}"/>
            <feFuncG type="table" tableValues="${rampTable(mixStart(sg), mixEnd(hg))}"/>
            <feFuncB type="table" tableValues="${rampTable(mixStart(sb), mixEnd(hb))}"/>
          </feComponentTransfer>
          <feColorMatrix type="matrix" values="
            ${I.toFixed(3)} 0 0 0 ${((1 - I) * 0.5).toFixed(3)}
            0 ${I.toFixed(3)} 0 0 ${((1 - I) * 0.5).toFixed(3)}
            0 0 ${I.toFixed(3)} 0 ${((1 - I) * 0.5).toFixed(3)}
            0 0 0 1 0"/>`;
      },
      drawOverlay(ctx, p, info) {
        const { width: w, height: h, seed } = info;
        drawRegistrationOffset(ctx, w, h, seed);
        drawLumaCoupledGrain(ctx, w, h, 0.4, "fine", seed);
        drawVignette(ctx, w, h, 0.3, 0.6);
      },
    },

    "studio-lighting": {
      buildSvg(p) {
        const I = pct(p.intensity, 70);
        const slope = (1 + 0.25 * I).toFixed(3);
        const inter = (-0.1 * I).toFixed(3);
        // Slight warm bias complements the warm key-light overlay instead of
        // fighting it.
        return `
          <feColorMatrix type="matrix" values="
            ${(1 + 0.02 * I).toFixed(3)} 0 0 0 0
            0 1 0 0 0
            0 0 ${(1 - 0.01 * I).toFixed(3)} 0 0
            0 0 0 1 0"/>
          <feComponentTransfer>
            <feFuncR type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncG type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncB type="linear" slope="${slope}" intercept="${inter}"/>
          </feComponentTransfer>`;
      },
      drawOverlay(ctx, p, info) {
        const { width: w, height: h } = info;
        const keyX = typeof p.lightX === "number" ? p.lightX : 50;
        const keyY = typeof p.lightY === "number" ? p.lightY : 40;
        const keyR = typeof p.lightRadius === "number" ? p.lightRadius : 55;
        const keyI = pct(p.lightIntensity, 55);
        drawRadialLight(ctx, w, h, keyX, keyY, keyR, keyI);
        drawFillLight(ctx, w, h, keyX, keyY, keyI);
        drawRimLight(ctx, w, h, keyX, keyI);
        drawVignette(ctx, w, h, 0.35, 0.35);
      },
    },

    // ---- WebGL LUT presets (pro tier) ----
    // These have no SVG / Canvas 2D pass. renderScene draws the raw source to
    // the canvas and the WebGL layer applies the LUT (+ optional grain +
    // lens aberration from the preset's controls).
    "lut-kodak-2383": {
      type: "lut",
      webgl: true,
      generateLUT() {
        return cachedLut("kodak-2383", lutKodak2383);
      },
    },
    "lut-bleach-bypass": {
      type: "lut",
      webgl: true,
      generateLUT() {
        return cachedLut("bleach-bypass", lutBleachBypass);
      },
    },
    "lut-teal-orange-pro": {
      type: "lut",
      webgl: true,
      generateLUT() {
        return cachedLut("teal-orange-pro", lutTealOrangePro);
      },
    },
    "lut-fuji-3510": {
      type: "lut",
      webgl: true,
      generateLUT() {
        return cachedLut("fuji-3510", lutFuji3510);
      },
    },
    "lut-cool-fade": {
      type: "lut",
      webgl: true,
      generateLUT() {
        return cachedLut("cool-fade", lutCoolFade);
      },
    },
    "lut-warm-print": {
      type: "lut",
      webgl: true,
      generateLUT() {
        return cachedLut("warm-print", lutWarmPrint);
      },
    },
  };

  // ---------- WebGL effect list builder ----------
  // Decides which WebGL passes (if any) should run after the SVG + Canvas 2D
  // stage. Returns an array of { type, params } descriptors consumed by
  // window.WebGLRenderer.apply. Empty array → no WebGL pass.
  function buildWebGlEffects(def, p, info) {
    const effects = [];

    if (def.type === "lut" && typeof def.generateLUT === "function") {
      effects.push({
        type: "lut",
        params: {
          lutData: def.generateLUT(),
          lutSize: LUT_SIZE,
          intensity: pct(p.intensity, 85),
        },
      });
      // LUT presets expose their own grain + aberration sliders.
      const grainAmt = pct(p.grain, 20);
      if (grainAmt > 0) {
        effects.push({
          type: "hqGrain",
          params: {
            amount: grainAmt,
            size: 1.5,
            seed: info.seed,
          },
        });
      }
      const abr = pct(p.aberration, 0);
      if (abr > 0) {
        effects.push({
          type: "chromaticAberration",
          params: { amount: abr, falloffEdge: 1.0 },
        });
      }
      return effects;
    }

    // Canvas 2D preset with optional pro enhancements.
    if (p.hqGrain === true) {
      effects.push({
        type: "hqGrain",
        params: { amount: 0.25, size: 1.5, seed: info.seed },
      });
    }
    if (typeof p.lensAberration === "number" && p.lensAberration > 0) {
      effects.push({
        type: "chromaticAberration",
        params: { amount: p.lensAberration / 100, falloffEdge: 1.0 },
      });
    }
    if (typeof p.lensDistortion === "number" && p.lensDistortion !== 0) {
      effects.push({
        type: "lensDistortion",
        params: { amount: p.lensDistortion / 100, zoom: 0.12 },
      });
    }
    return effects;
  }

  function hasActiveWebgl(def, p) {
    if (def.webgl === true) return true;
    return Boolean(
      p &&
        (p.hqGrain === true ||
          (typeof p.lensAberration === "number" && p.lensAberration > 0) ||
          (typeof p.lensDistortion === "number" && p.lensDistortion !== 0)),
    );
  }

  // Renders a single layer onto targetCanvas. sourceImg may be an
  // HTMLImageElement or an HTMLCanvasElement (output of a previous layer).
  async function renderLayer({
    sourceImg,
    svgDefs,
    filterDefId,
    targetCanvas,
    preset,
    params,
    seed,
    mask,
    curves,
  }) {
    const def = PRESETS[preset];
    if (!def) throw new Error(`Unknown preset: ${preset}`);
    // Only wait for network load when sourceImg is a real Image element.
    if (sourceImg instanceof HTMLImageElement) {
      if (!sourceImg.complete || sourceImg.naturalWidth === 0) {
        await new Promise((resolve, reject) => {
          sourceImg.addEventListener("load", resolve, { once: true });
          sourceImg.addEventListener("error", reject, { once: true });
        });
      }
    }

    const w = targetCanvas.width;
    const h = targetCanvas.height;
    const ctx = targetCanvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const p = params || {};
    const info = { width: w, height: h, seed: (seed >>> 0) || 1 };

    if (def.type === "lut") {
      // LUT path: source pixels only — WebGL colour-grades them.
      ctx.drawImage(sourceImg, 0, 0, w, h);
    } else {
      // Add this layer's filter to the shared svgDefs host. Multiple layers
      // coexist because we use unique filter ids per layer.
      const existing = svgDefs.querySelector("#" + filterDefId);
      if (existing) existing.remove();
      svgDefs.insertAdjacentHTML(
        "beforeend",
        `<filter id="${filterDefId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">${def.buildSvg(p)}</filter>`,
      );
      ctx.filter = `url(#${filterDefId})`;
      ctx.drawImage(sourceImg, 0, 0, w, h);
      ctx.filter = "none";
      if (typeof def.drawOverlay === "function") def.drawOverlay(ctx, p, info);
    }

    if (hasActiveWebgl(def, p)) {
      const effects = buildWebGlEffects(def, p, info);
      if (
        effects.length > 0 &&
        typeof window !== "undefined" &&
        window.WebGLRenderer
      ) {
        try {
          const ok = window.WebGLRenderer.init(targetCanvas);
          if (ok) window.WebGLRenderer.apply(targetCanvas, effects);
        } catch (err) {
          console.warn("[filters] WebGL pass failed:", err && err.message);
        }
      }
    }

    // Per-layer mask: blend original source pixels with effected pixels.
    if (mask) applyMask(sourceImg, targetCanvas, mask);

    // Per-layer curves: last per-layer adjustment before result passes on.
    if (curves) applyCurves(targetCanvas, curves);
  }

  // ---------- Orchestrator ----------
  // Renders a layer stack sequentially into `canvas`. Pipeline:
  //   1. Start with source image on a work canvas.
  //   2. For each visible layer: apply preset, then blend back the pre-effect
  //      snapshot at (1 - intensity/100) opacity to implement layer intensity.
  //   3. If overlay is provided, render it onto a second offscreen canvas.
  //   4. If knockout text is provided, punch it out of the overlay canvas.
  //   5. Composite: workCanvas result, then overlay on top.
  //
  // `layers` is an array of { preset, params, visible, intensity } objects.
  async function renderScene({
    img,
    svgDefs,
    canvas,
    layers,
    seed,
    overlay,
    knockout,
    applyKnockoutText,
    hslAdjustments,
  }) {
    if (!img.complete || img.naturalWidth === 0) {
      await new Promise((resolve, reject) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", reject, { once: true });
      });
    }

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;
    svgDefs.innerHTML = ""; // Fresh per render.

    // Accumulator canvas — starts as the raw source image.
    const workCanvas = makeCanvas(w, h);
    workCanvas.getContext("2d").drawImage(img, 0, 0, w, h);

    // Process each visible layer sequentially.
    const allLayers = Array.isArray(layers) ? layers : [];
    let layerIndex = 0;
    for (const layer of allLayers) {
      if (layer.visible === false) continue;

      const intensity = typeof layer.intensity === "number" ? layer.intensity : 100;

      // Snapshot workCanvas before this layer (needed for intensity blend).
      let snapshotCanvas = null;
      if (intensity < 100) {
        snapshotCanvas = makeCanvas(w, h);
        snapshotCanvas.getContext("2d").drawImage(workCanvas, 0, 0);
      }

      // Render this layer using the current workCanvas as source.
      const effectCanvas = makeCanvas(w, h);
      await renderLayer({
        sourceImg: workCanvas,
        svgDefs,
        filterDefId: `imgFilter_layer_${layerIndex}_${layer.preset}`,
        targetCanvas: effectCanvas,
        preset: layer.preset,
        params: layer.params || {},
        seed,
        mask:   layer.mask   || null,
        curves: layer.curves || null,
      });

      // Copy effect result back to workCanvas.
      const workCtx = workCanvas.getContext("2d");
      workCtx.clearRect(0, 0, w, h);
      workCtx.drawImage(effectCanvas, 0, 0);

      // Blend the pre-effect snapshot back at (1 - intensity/100) opacity.
      // At intensity=100 nothing is blended back (full effect visible).
      // At intensity=0 the snapshot fully overrides (layer has no visible effect).
      if (snapshotCanvas !== null) {
        workCtx.globalAlpha = 1 - intensity / 100;
        workCtx.drawImage(snapshotCanvas, 0, 0);
        workCtx.globalAlpha = 1;
      }

      layerIndex++;
    }

    // Global HSL pass: runs after all filter layers, before overlay composite.
    if (hslAdjustments) applyHSLAdjustments(workCanvas, hslAdjustments);

    let overlayCanvas = null;
    if (overlay && overlay.img) {
      overlayCanvas = makeCanvas(w, h);
      await renderLayer({
        sourceImg: overlay.img,
        svgDefs,
        filterDefId: `imgFilter_overlay_${overlay.preset}`,
        targetCanvas: overlayCanvas,
        preset: overlay.preset,
        params: overlay.params || {},
        seed,
      });

      if (knockout && typeof applyKnockoutText === "function") {
        applyKnockoutText(overlayCanvas, knockout);
      }
    }

    // Final composite.
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(workCanvas, 0, 0);
    if (overlayCanvas) ctx.drawImage(overlayCanvas, 0, 0);
  }

  global.ImageFilters = { PRESETS, renderScene, renderLayer, hashSeed, mulberry32 };
})(typeof window !== "undefined" ? window : globalThis);
