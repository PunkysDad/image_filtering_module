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
  function rampTable(from, to) {
    return `${from.toFixed(4)} ${to.toFixed(4)}`;
  }

  // ---------- Canvas overlay primitives ----------
  function drawVignette(ctx, info, amount, softness = 0.5) {
    if (amount <= 0) return;
    const { width: w, height: h } = info;
    const inner = Math.min(w, h) * (0.15 + softness * 0.35);
    const outer = Math.hypot(w, h) / 1.5;
    const g = ctx.createRadialGradient(w / 2, h / 2, inner, w / 2, h / 2, outer);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${clamp(amount, 0, 1)})`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function makeGrainTile(size, rng) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const tctx = c.getContext("2d");
    const d = tctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const n = Math.floor(rng() * 256);
      d.data[i * 4] = n;
      d.data[i * 4 + 1] = n;
      d.data[i * 4 + 2] = n;
      d.data[i * 4 + 3] = 255;
    }
    tctx.putImageData(d, 0, 0);
    return c;
  }

  function drawGrain(ctx, info, amount, size = "medium") {
    if (amount <= 0) return;
    const scales = { fine: 1, medium: 2, coarse: 4 };
    const scale = scales[size] || 2;
    const rng = mulberry32(info.seed ^ 0xa1b2c3);
    const tileSize = 256;
    const tile = makeGrainTile(tileSize, rng);
    const tw = tileSize * scale;
    const th = tileSize * scale;
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = clamp(amount * 0.55, 0, 1);
    for (let y = 0; y < info.height; y += th) {
      for (let x = 0; x < info.width; x += tw) {
        ctx.drawImage(tile, x, y, tw, th);
      }
    }
    ctx.restore();
  }

  function drawScanLines(ctx, info, opacity = 0.25) {
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "#000";
    const step = Math.max(2, Math.round(info.height / 400));
    for (let y = 0; y < info.height; y += step * 2) {
      ctx.fillRect(0, y, info.width, step);
    }
    ctx.restore();
  }

  function drawLetterbox(ctx, info, ratio = 0.08) {
    const bar = Math.round(info.height * ratio);
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, info.width, bar);
    ctx.fillRect(0, info.height - bar, info.width, bar);
    ctx.restore();
  }

  function drawDustScratches(ctx, info, amount) {
    if (amount <= 0) return;
    const rng = mulberry32(info.seed ^ 0xd5d5d5);
    const density = Math.floor(info.width * info.height * 0.00008 * amount);
    ctx.save();
    ctx.globalCompositeOperation = "lighten";
    for (let i = 0; i < density; i++) {
      const x = rng() * info.width;
      const y = rng() * info.height;
      const r = rng() * 1.6 + 0.3;
      const a = rng() * 0.35 + 0.1;
      ctx.fillStyle = `rgba(240,240,235,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const scratches = Math.floor(amount * 10);
    for (let i = 0; i < scratches; i++) {
      const x = rng() * info.width;
      const h = rng() * info.height * 0.6 + 40;
      const a = rng() * 0.25 + 0.1;
      ctx.strokeStyle = `rgba(220,220,210,${a})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, rng() * info.height);
      ctx.lineTo(x + (rng() * 16 - 8), h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCanvasTexture(ctx, info, scale = "medium", opacity = 0.4) {
    if (opacity <= 0) return;
    const sizes = { fine: 128, medium: 256, coarse: 512 };
    const tileSize = sizes[scale] || 256;
    const rng = mulberry32(info.seed ^ 0xcafe);
    const c = document.createElement("canvas");
    c.width = tileSize;
    c.height = tileSize;
    const tctx = c.getContext("2d");
    const d = tctx.createImageData(tileSize, tileSize);
    // Weave-like texture: combine two noise frequencies.
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const i = (y * tileSize + x) * 4;
        const weave =
          (Math.sin(x * 0.5) * 0.5 + 0.5) * 0.3 +
          (Math.sin(y * 0.5) * 0.5 + 0.5) * 0.3 +
          rng() * 0.4;
        const v = Math.floor(weave * 255);
        d.data[i] = v;
        d.data[i + 1] = v;
        d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
    }
    tctx.putImageData(d, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = clamp(opacity, 0, 1);
    const pat = ctx.createPattern(c, "repeat");
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, info.width, info.height);
    ctx.restore();
  }

  function drawRoughEdgeVignette(ctx, info, amount) {
    if (amount <= 0) return;
    const { width: w, height: h } = info;
    const rng = mulberry32(info.seed ^ 0xed6e);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = clamp(amount, 0, 1);
    const margin = Math.min(w, h) * 0.04;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    // Cut out a rough inner shape
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * w + (rng() - 0.5) * margin * 2;
      const y = margin + (rng() - 0.5) * margin;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = w - margin + (rng() - 0.5) * margin;
      const y = t * h + (rng() - 0.5) * margin * 2;
      ctx.lineTo(x, y);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = (1 - t) * w + (rng() - 0.5) * margin * 2;
      const y = h - margin + (rng() - 0.5) * margin;
      ctx.lineTo(x, y);
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = margin + (rng() - 0.5) * margin;
      const y = (1 - t) * h + (rng() - 0.5) * margin * 2;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRadialLight(ctx, info, cxPct, cyPct, radiusPct, intensity) {
    if (intensity <= 0) return;
    const { width: w, height: h } = info;
    const cx = (cxPct / 100) * w;
    const cy = (cyPct / 100) * h;
    const radius = (radiusPct / 100) * Math.hypot(w, h);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, radius));
    g.addColorStop(0, `rgba(255,245,225,${clamp(intensity, 0, 1)})`);
    g.addColorStop(1, "rgba(255,245,225,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Bloom: extract bright pixels from the already-rendered canvas, blur, screen-blend back.
  function drawBloom(ctx, info, amount, threshold = 0.65) {
    if (amount <= 0) return;
    const { width: w, height: h } = info;
    const src = ctx.getImageData(0, 0, w, h);
    const bright = ctx.createImageData(w, h);
    const t = clamp(threshold, 0, 0.99);
    for (let i = 0; i < src.data.length; i += 4) {
      const r = src.data[i] / 255;
      const g = src.data[i + 1] / 255;
      const b = src.data[i + 2] / 255;
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const keep = Math.max(0, lum - t) / (1 - t);
      bright.data[i] = src.data[i] * keep;
      bright.data[i + 1] = src.data[i + 1] * keep;
      bright.data[i + 2] = src.data[i + 2] * keep;
      bright.data[i + 3] = 255;
    }
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d").putImageData(bright, 0, 0);

    const blurred = document.createElement("canvas");
    blurred.width = w;
    blurred.height = h;
    const bctx = blurred.getContext("2d");
    bctx.filter = `blur(${Math.max(4, Math.round(Math.min(w, h) * 0.015))}px)`;
    bctx.drawImage(tmp, 0, 0);
    bctx.filter = "none";

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = clamp(amount, 0, 1);
    ctx.drawImage(blurred, 0, 0);
    ctx.restore();
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
        const I = pct(p.intensity, 70);
        drawGrain(ctx, info, I * 0.9, p.grainSize || "medium");
        drawVignette(ctx, info, pct(p.vignetteStrength, 40) * 0.9, 0.45);
      },
    },

    cinematic: {
      buildSvg(p) {
        const I = pct(p.intensity, 70);
        const T = pct(p.tealOrangeStrength, 65);
        // Shadow → teal, highlight → orange via per-channel tableValues.
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
        const I = pct(p.intensity, 70);
        drawBloom(ctx, info, pct(p.bloomAmount, 35) * 0.8, 0.62);
        drawVignette(ctx, info, 0.35 + I * 0.15, 0.4);
        if (p.letterbox) drawLetterbox(ctx, info, 0.085);
      },
    },

    "matte-fade": {
      buildSvg(p) {
        const I = pct(p.intensity, 70);
        const F = pct(p.fadeAmount, 55);
        const C = pct(p.coolShift, 40);
        const floor = (F * 0.28).toFixed(3);
        const slope = (1 - 0.22 * I - F * 0.12).toFixed(3);
        const inter = floor; // lifted blacks
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
        drawDustScratches(ctx, info, pct(p.intensity, 70) * 0.5);
        drawVignette(ctx, info, 0.25, 0.55);
      },
    },

    "bw-contrast": {
      buildSvg(p) {
        const I = pct(p.intensity, 85);
        const C = pct(p.contrast, 70);
        const slope = (1 + 1.2 * C).toFixed(3);
        const inter = (-0.5 * C).toFixed(3);
        return `
          <feColorMatrix type="saturate" values="${(1 - I).toFixed(3)}"/>
          <feComponentTransfer>
            <feFuncR type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncG type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncB type="linear" slope="${slope}" intercept="${inter}"/>
          </feComponentTransfer>`;
      },
      drawOverlay(ctx, p, info) {
        drawGrain(ctx, info, pct(p.grainAmount, 50) * 0.9, "medium");
        drawVignette(ctx, info, 0.45, 0.4);
        if (p.scanLines) drawScanLines(ctx, info, 0.22);
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
        const I = pct(p.intensity, 70);
        const radius = pct(p.glowRadius, 60);
        const threshold = 1 - pct(p.bloomThreshold, 55) * 0.6; // higher threshold slider → softer cutoff
        drawBloom(ctx, info, I * 0.9, clamp(threshold, 0.15, 0.9));
        // Gentle soft overlay glow
        const w = info.width,
          h = info.height;
        const g = ctx.createRadialGradient(
          w / 2,
          h / 2,
          0,
          w / 2,
          h / 2,
          Math.hypot(w, h) * (0.3 + radius * 0.5),
        );
        g.addColorStop(0, `rgba(255,240,220,${0.06 + I * 0.1})`);
        g.addColorStop(1, "rgba(255,240,220,0)");
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      },
    },

    "canvas-texture": {
      buildSvg(p) {
        const I = pct(p.intensity, 55);
        return `
          <feColorMatrix type="saturate" values="${(1 - 0.15 * I).toFixed(3)}"/>
          <feColorMatrix type="matrix" values="
            ${(1 + 0.04 * I).toFixed(3)} 0 0 0 0
            0 1 0 0 0
            0 0 ${(1 - 0.03 * I).toFixed(3)} 0 0
            0 0 0 1 0"/>`;
      },
      drawOverlay(ctx, p, info) {
        drawCanvasTexture(
          ctx,
          info,
          p.textureScale || "medium",
          pct(p.textureOpacity, 55),
        );
        drawRoughEdgeVignette(ctx, info, pct(p.intensity, 55) * 0.35);
      },
    },

    duotone: {
      buildSvg(p) {
        const [sr, sg, sb] = hexToRgb(p.shadowColor || "#1a2a6c");
        const [hr, hg, hb] = hexToRgb(p.highlightColor || "#ffcc66");
        const I = pct(p.intensity, 90);
        // At intensity < 1, we blend toward neutral by pushing endpoints toward 0/1.
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
        drawVignette(ctx, info, 0.2, 0.6);
      },
    },

    "studio-lighting": {
      buildSvg(p) {
        const I = pct(p.intensity, 70);
        const slope = (1 + 0.25 * I).toFixed(3);
        const inter = (-0.1 * I).toFixed(3);
        return `
          <feColorMatrix type="matrix" values="
            ${(1 - 0.02 * I).toFixed(3)} 0 0 0 0
            0 1 0 0 0
            0 0 ${(1 + 0.04 * I).toFixed(3)} 0 0
            0 0 0 1 0"/>
          <feComponentTransfer>
            <feFuncR type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncG type="linear" slope="${slope}" intercept="${inter}"/>
            <feFuncB type="linear" slope="${slope}" intercept="${inter}"/>
          </feComponentTransfer>`;
      },
      drawOverlay(ctx, p, info) {
        drawRadialLight(
          ctx,
          info,
          typeof p.lightX === "number" ? p.lightX : 50,
          typeof p.lightY === "number" ? p.lightY : 40,
          typeof p.lightRadius === "number" ? p.lightRadius : 55,
          pct(p.lightIntensity, 55),
        );
        drawVignette(ctx, info, 0.35, 0.35);
      },
    },
  };

  // ---------- Orchestrator ----------
  // Renders the scene into `canvas`, using `img` as the source and an SVG filter
  // injected into `svgDefs`. Returns a Promise that resolves when complete.
  async function renderScene({
    img,
    svgDefs,
    canvas,
    preset,
    params,
    seed,
  }) {
    const def = PRESETS[preset];
    if (!def) throw new Error(`Unknown preset: ${preset}`);
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

    const filterId = `imgFilter_${preset}`;
    svgDefs.innerHTML = `<filter id="${filterId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">${def.buildSvg(params || {})}</filter>`;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.filter = `url(#${filterId})`;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = "none";

    const info = { width: w, height: h, seed: (seed >>> 0) || 1 };
    def.drawOverlay(ctx, params || {}, info);
  }

  global.ImageFilters = { PRESETS, renderScene, hashSeed, mulberry32 };
})(typeof window !== "undefined" ? window : globalThis);
