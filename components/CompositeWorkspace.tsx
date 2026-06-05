"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  PRESETS,
  PRESETS_BY_ID,
  PresetId,
  defaultParams,
  Control,
  PresetDef,
} from "@/lib/filters";
import type {
  FilterLayer,
  MaskChannel,
  MaskChannelSettings,
  LayerMask,
  CurvePoint,
  CurveChannel,
  LayerCurves,
} from "@/app/page";

// ---------- Local type aliases ----------

type Params = Record<string, string | number | boolean>;

const DEFAULT_CHANNEL_SETTINGS: MaskChannelSettings = {
  expansion: 50,
  smoothness: 50,
  invert: false,
};

function defaultChannels(): Record<MaskChannel, MaskChannelSettings> {
  return {
    reds:     { ...DEFAULT_CHANNEL_SETTINGS },
    oranges:  { ...DEFAULT_CHANNEL_SETTINGS },
    yellows:  { ...DEFAULT_CHANNEL_SETTINGS },
    greens:   { ...DEFAULT_CHANNEL_SETTINGS },
    cyans:    { ...DEFAULT_CHANNEL_SETTINGS },
    blues:    { ...DEFAULT_CHANNEL_SETTINGS },
    magentas: { ...DEFAULT_CHANNEL_SETTINGS },
  };
}

function defaultMask(): LayerMask {
  return {
    luminosity: { enabled: false, min: 0, max: 255, smoothness: 50, invert: false },
    colorRange:  { enabled: false, activeChannels: [], focusedChannel: null, channels: defaultChannels() },
  };
}

function defaultLayerCurves(): LayerCurves {
  return {
    rgb: [[0, 0], [255, 255]],
    r:   [[0, 0], [255, 255]],
    g:   [[0, 0], [255, 255]],
    b:   [[0, 0], [255, 255]],
  };
}

const MASK_CHANNEL_DEFS: { key: MaskChannel; label: string; color: string }[] = [
  { key: "reds",     label: "R", color: "#ff4040" },
  { key: "oranges",  label: "O", color: "#ff9800" },
  { key: "yellows",  label: "Y", color: "#ffe500" },
  { key: "greens",   label: "G", color: "#44bb44" },
  { key: "cyans",    label: "C", color: "#00ccdd" },
  { key: "blues",    label: "B", color: "#4488ff" },
  { key: "magentas", label: "M", color: "#ff44cc" },
];

const CURVE_CHANNEL_DEFS: { key: CurveChannel; label: string; color: string }[] = [
  { key: "rgb", label: "RGB", color: "#ffffff" },
  { key: "r",   label: "R",   color: "#ff6b6b" },
  { key: "g",   label: "G",   color: "#6bff8a" },
  { key: "b",   label: "B",   color: "#6b9fff" },
];

// ---------- Layer state ----------

type LayerAction =
  | { type: "add"; preset: PresetId; id: string }
  | { type: "remove"; id: string }
  | { type: "set-params"; id: string; params: Params }
  | { type: "toggle-visible"; id: string }
  | { type: "set-intensity"; id: string; intensity: number }
  | { type: "set-mask";   id: string; mask: LayerMask }
  | { type: "set-curves"; id: string; curves: LayerCurves }
  | { type: "reorder"; from: number; to: number }
  | { type: "restore"; layers: FilterLayer[] };

function layersReducer(state: FilterLayer[], action: LayerAction): FilterLayer[] {
  switch (action.type) {
    case "add": {
      if (state.length >= 5) return state;
      return [
        ...state,
        {
          id: action.id,
          preset: action.preset,
          params: defaultParams(PRESETS_BY_ID[action.preset]) as Params,
          visible: true,
          intensity: 100,
          mask:   defaultMask(),
          curves: defaultLayerCurves(),
        },
      ];
    }
    case "remove":         return state.filter((l) => l.id !== action.id);
    case "set-params":     return state.map((l) => l.id === action.id ? { ...l, params: action.params } : l);
    case "toggle-visible": return state.map((l) => l.id === action.id ? { ...l, visible: !l.visible } : l);
    case "set-intensity":  return state.map((l) => l.id === action.id ? { ...l, intensity: action.intensity } : l);
    case "set-mask":       return state.map((l) => l.id === action.id ? { ...l, mask: action.mask } : l);
    case "set-curves":     return state.map((l) => l.id === action.id ? { ...l, curves: action.curves } : l);
    case "reorder": {
      const next = [...state];
      const [moved] = next.splice(action.from, 1);
      next.splice(action.to, 0, moved);
      return next;
    }
    case "restore": return action.layers;
    default: return state;
  }
}

type CompositeSubject = {
  id: string;
  name: string;
  isolatedPath: string;
  layers: FilterLayer[];
  position: { x: number; y: number };
  scale: number;
};

// A single global overlay image drawn on top of the background and all
// subjects in the composite stack.
type CompositeOverlay = {
  imagePath: string;          // /uploads/... of the uploaded overlay image
  layers: FilterLayer[];      // filter stack (same FilterLayer type as subjects)
  opacity: number;            // 0–1, default 1.0
  position: { x: number; y: number }; // px offset from center, default {x:0,y:0}
  scale: number;              // size multiplier, default 1.0
};

type SubjectsAction =
  | { type: "add"; subject: CompositeSubject }
  | { type: "remove"; id: string }
  | { type: "rename"; id: string; name: string }
  | { type: "move"; id: string; position: { x: number; y: number } }
  | { type: "set-scale"; id: string; scale: number }
  | { type: "layer"; id: string; action: LayerAction };

function subjectsReducer(state: CompositeSubject[], action: SubjectsAction): CompositeSubject[] {
  switch (action.type) {
    case "add":       return state.length >= 5 ? state : [...state, action.subject];
    case "remove":    return state.filter((s) => s.id !== action.id);
    case "rename":    return state.map((s) => s.id === action.id ? { ...s, name: action.name } : s);
    case "move":      return state.map((s) => s.id === action.id ? { ...s, position: action.position } : s);
    case "set-scale": return state.map((s) => s.id === action.id ? { ...s, scale: action.scale } : s);
    case "layer":     return state.map((s) => s.id === action.id ? { ...s, layers: layersReducer(s.layers, action.action) } : s);
    default:          return state;
  }
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), ms);
    return () => clearTimeout(h);
  }, [value, ms]);
  return v;
}

// ---------- Brush mask edit state ----------

type MaskEditState = {
  subjectId: string;
  mode: "erase" | "restore";
  brushSize: number;
  brushHardness: number;
  undoStack: Float32Array[];
  redoStack: Float32Array[];
};

type MaskEditUIState = {
  subjectId: string;
  mode: "erase" | "restore";
  brushSize: number;
  brushHardness: number;
  canUndo: boolean;
  canRedo: boolean;
};

// ============================================================
// Module-level utilities
// ============================================================

async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body });
  if (!res.ok) {
    const j = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(j.error || `Upload failed: ${res.status}`);
  }
  const json = (await res.json()) as { imagePath: string };
  return json.imagePath;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob returned null"));
    }, type);
  });
}

// Post-processes the background-removed PNG before upload and preview.
// Step 1: blur the alpha channel only (edge feathering, radius 2).
// Step 2: replace edge pixel RGB with inward-sampled opaque-neighbor average
//         (edge decontamination, removes background color spill).
async function processIsolatedSubject(blob: Blob): Promise<Blob> {
  // Decode blob → ImageData via a temporary canvas.
  const blobUrl = URL.createObjectURL(blob);
  const img = await loadImage(blobUrl).finally(() => URL.revokeObjectURL(blobUrl));
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const decodeCanvas = document.createElement("canvas");
  decodeCanvas.width = w;
  decodeCanvas.height = h;
  const decodeCtx = decodeCanvas.getContext("2d")!;
  decodeCtx.drawImage(img, 0, 0);
  const imgData = decodeCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // --- Step 1: Edge Feathering — blur alpha channel only ---
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3] / 255;

  // Separable Gaussian, radius 2: [0.0625, 0.25, 0.375, 0.25, 0.0625]
  const KERNEL = [0.0625, 0.25, 0.375, 0.25, 0.0625];
  const R = 2;
  const tmp = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -R; k <= R; k++) {
        sum += alpha[y * w + Math.max(0, Math.min(w - 1, x + k))] * KERNEL[k + R];
      }
      tmp[y * w + x] = sum;
    }
  }

  const blurredAlpha = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -R; k <= R; k++) {
        sum += tmp[Math.max(0, Math.min(h - 1, y + k)) * w + x] * KERNEL[k + R];
      }
      blurredAlpha[y * w + x] = sum;
    }
  }

  // Write blurred alpha back — RGB is not touched.
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = Math.round(blurredAlpha[i] * 255);

  // --- Step 2: Edge Decontamination — remove background color spill ---
  // Fully opaque neighbors (blurredAlpha > 0.95) are never modified by this
  // loop, so their RGB can be read directly from `data` without a snapshot.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const a = blurredAlpha[idx];
      if (a < 0.05 || a > 0.95) continue;

      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (blurredAlpha[nIdx] > 0.95) {
            sumR += data[nIdx * 4];
            sumG += data[nIdx * 4 + 1];
            sumB += data[nIdx * 4 + 2];
            count++;
          }
        }
      }

      if (count >= 2) {
        const i4 = idx * 4;
        data[i4]     = Math.round(sumR / count);
        data[i4 + 1] = Math.round(sumG / count);
        data[i4 + 2] = Math.round(sumB / count);
      }
    }
  }

  // Convert modified ImageData back to a PNG Blob.
  if (typeof OffscreenCanvas !== "undefined") {
    const oc = new OffscreenCanvas(w, h);
    const octx = oc.getContext("2d") as OffscreenCanvasRenderingContext2D | null;
    if (octx) {
      octx.putImageData(imgData, 0, 0);
      return oc.convertToBlob({ type: "image/png" });
    }
  }
  const outCanvas = document.createElement("canvas");
  outCanvas.width = w;
  outCanvas.height = h;
  outCanvas.getContext("2d")!.putImageData(imgData, 0, 0);
  return canvasToBlob(outCanvas);
}

// ============================================================
// Bounding-box selection types and helpers
// ============================================================

type BBox = { x: number; y: number; w: number; h: number }; // image pixel coords
type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type DragState =
  | { kind: "none" }
  | { kind: "drawing"; startX: number; startY: number }
  | { kind: "moving";   startX: number; startY: number; origBox: BBox }
  | { kind: "resizing"; handle: HandleId; startX: number; startY: number; origBox: BBox };

type Layout = {
  cW: number; cH: number; iW: number; iH: number;
  scale: number; drawX: number; drawY: number; drawW: number; drawH: number;
};

function computeLayout(cW: number, cH: number, iW: number, iH: number): Layout {
  const scale = Math.min(cW / iW, cH / iH);
  const drawW = iW * scale;
  const drawH = iH * scale;
  return { cW, cH, iW, iH, scale, drawX: (cW - drawW) / 2, drawY: (cH - drawH) / 2, drawW, drawH };
}

function imgToCanvas(ix: number, iy: number, l: Layout) {
  return { x: ix * l.scale + l.drawX, y: iy * l.scale + l.drawY };
}

function canvasToImg(cx: number, cy: number, l: Layout) {
  return {
    x: Math.max(0, Math.min(l.iW, (cx - l.drawX) / l.scale)),
    y: Math.max(0, Math.min(l.iH, (cy - l.drawY) / l.scale)),
  };
}

function getHandlePositions(box: BBox, l: Layout) {
  const p1 = imgToCanvas(box.x, box.y, l);
  const p2 = imgToCanvas(box.x + box.w, box.y + box.h, l);
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  return [
    { id: "nw" as HandleId, x: p1.x, y: p1.y },
    { id: "n"  as HandleId, x: mx,   y: p1.y },
    { id: "ne" as HandleId, x: p2.x, y: p1.y },
    { id: "e"  as HandleId, x: p2.x, y: my   },
    { id: "se" as HandleId, x: p2.x, y: p2.y },
    { id: "s"  as HandleId, x: mx,   y: p2.y },
    { id: "sw" as HandleId, x: p1.x, y: p2.y },
    { id: "w"  as HandleId, x: p1.x, y: my   },
  ];
}

const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: "nw-resize", n: "n-resize", ne: "ne-resize",
  e: "e-resize", se: "se-resize", s: "s-resize",
  sw: "sw-resize", w: "w-resize",
};

// ============================================================
// SelectionCanvas
// ============================================================

function SelectionCanvas({
  imageSrc,
  box,
  onBoxChange,
}: {
  imageSrc: string;
  box: BBox | null;
  onBoxChange: (box: BBox | null) => void;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const layoutRef  = useRef<Layout | null>(null);
  const dragRef    = useRef<DragState>({ kind: "none" });
  const boxRef     = useRef<BBox | null>(box);
  const [cursor, setCursor] = useState("crosshair");
  const [imgLoaded, setImgLoaded] = useState(false);

  boxRef.current = box;

  useEffect(() => {
    setImgLoaded(false);
    imgRef.current = null;
    const img = new Image();
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw whenever image or box changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const layout = computeLayout(canvas.width, canvas.height, img.naturalWidth, img.naturalHeight);
    layoutRef.current = layout;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, layout.cW, layout.cH);
    ctx.fillStyle = "#0d0d0f";
    ctx.fillRect(0, 0, layout.cW, layout.cH);
    ctx.drawImage(img, layout.drawX, layout.drawY, layout.drawW, layout.drawH);

    const b = box;
    if (b && b.w > 0 && b.h > 0) {
      const p1 = imgToCanvas(b.x, b.y, layout);
      const p2 = imgToCanvas(b.x + b.w, b.y + b.h, layout);
      const bx = p1.x, by = p1.y, bw = p2.x - p1.x, bh = p2.y - p1.y;

      // Dark overlay outside selection
      ctx.fillStyle = "rgba(0,0,0,0.52)";
      ctx.fillRect(0, 0, layout.cW, by);
      ctx.fillRect(0, by + bh, layout.cW, layout.cH - by - bh);
      ctx.fillRect(0, by, bx, bh);
      ctx.fillRect(bx + bw, by, layout.cW - bx - bw, bh);

      // Dashed border
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();

      // Handles
      for (const h of getHandlePositions(b, layout)) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [imgLoaded, box]);

  const getCanvasPt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const hitHandle = (cx: number, cy: number): HandleId | null => {
    const b = boxRef.current;
    const l = layoutRef.current;
    if (!b || !l) return null;
    for (const h of getHandlePositions(b, l)) {
      const dx = cx - h.x, dy = cy - h.y;
      if (dx * dx + dy * dy <= 100) return h.id; // 10px radius
    }
    return null;
  };

  const hitBoxInterior = (cx: number, cy: number): boolean => {
    const b = boxRef.current;
    const l = layoutRef.current;
    if (!b || !l) return false;
    const p1 = imgToCanvas(b.x, b.y, l);
    const p2 = imgToCanvas(b.x + b.w, b.y + b.h, l);
    return cx >= p1.x && cx <= p2.x && cy >= p1.y && cy <= p2.y;
  };

  const applyResize = (handle: HandleId, dx: number, dy: number, orig: BBox, iW: number, iH: number): BBox => {
    let { x, y, w, h } = orig;
    if (handle.includes("w")) { x += dx; w -= dx; }
    if (handle.includes("e")) { w += dx; }
    if (handle.includes("n")) { y += dy; h -= dy; }
    if (handle.includes("s")) { h += dy; }
    const MIN = 20;
    if (w < MIN) { if (handle.includes("w")) x = orig.x + orig.w - MIN; w = MIN; }
    if (h < MIN) { if (handle.includes("n")) y = orig.y + orig.h - MIN; h = MIN; }
    x = Math.max(0, x); y = Math.max(0, y);
    if (x + w > iW) w = iW - x;
    if (y + h > iH) h = iH - y;
    return { x, y, w, h };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const pt = getCanvasPt(e);
    const l  = layoutRef.current;
    if (!pt || !l) return;
    e.preventDefault();

    const imgPt = canvasToImg(pt.x, pt.y, l);
    const existing = boxRef.current;

    if (existing) {
      const handle = hitHandle(pt.x, pt.y);
      if (handle) {
        dragRef.current = { kind: "resizing", handle, startX: imgPt.x, startY: imgPt.y, origBox: { ...existing } };
        return;
      }
      if (hitBoxInterior(pt.x, pt.y)) {
        dragRef.current = { kind: "moving", startX: imgPt.x, startY: imgPt.y, origBox: { ...existing } };
        return;
      }
    }

    dragRef.current = { kind: "drawing", startX: imgPt.x, startY: imgPt.y };
    onBoxChange(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const pt   = getCanvasPt(e);
    const l    = layoutRef.current;
    if (!pt || !l) return;

    // Cursor hover (when not dragging)
    if (drag.kind === "none") {
      const existing = boxRef.current;
      if (existing) {
        const h = hitHandle(pt.x, pt.y);
        if (h) { setCursor(HANDLE_CURSORS[h]); return; }
        if (hitBoxInterior(pt.x, pt.y)) { setCursor("move"); return; }
      }
      setCursor("crosshair");
      return;
    }

    e.preventDefault();
    const imgPt = canvasToImg(pt.x, pt.y, l);

    if (drag.kind === "drawing") {
      const x = Math.min(drag.startX, imgPt.x);
      const y = Math.min(drag.startY, imgPt.y);
      const w = Math.abs(imgPt.x - drag.startX);
      const h = Math.abs(imgPt.y - drag.startY);
      if (w > 3 || h > 3) onBoxChange({ x, y, w: Math.max(w, 1), h: Math.max(h, 1) });
    } else if (drag.kind === "moving") {
      const dx = imgPt.x - drag.startX;
      const dy = imgPt.y - drag.startY;
      let { x, y, w, h } = drag.origBox;
      x = Math.max(0, Math.min(l.iW - w, x + dx));
      y = Math.max(0, Math.min(l.iH - h, y + dy));
      onBoxChange({ x, y, w, h });
    } else if (drag.kind === "resizing") {
      const dx = imgPt.x - drag.startX;
      const dy = imgPt.y - drag.startY;
      onBoxChange(applyResize(drag.handle, dx, dy, drag.origBox, l.iW, l.iH));
    }
  };

  const onMouseUp = () => { dragRef.current = { kind: "none" }; };

  return (
    <div className="w-full relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full rounded-lg border border-ink-600 block"
        style={{ cursor, userSelect: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      {!imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main composite workspace
// ============================================================

export default function CompositeWorkspace({
  onExportReady,
}: {
  onExportReady: (url: string, filename: string) => void;
}) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Background
  const [bgPath, setBgPath]           = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

  // Subjects
  const [subjects, dispatchSubjects]        = useReducer(subjectsReducer, []);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [addingSubject, setAddingSubject]     = useState(false);
  const subjectsRef        = useRef<CompositeSubject[]>([]);
  const activeSubjectIdRef = useRef<string | null>(null);

  // Background layer stack
  const [bgLayers, dispatchBg] = useReducer(layersReducer, []);
  const [bgActiveLayerId, setBgActiveLayerId] = useState("");
  const [bgShowPresetModal, setBgShowPresetModal] = useState(false);
  const [bgPanelTab, setBgPanelTab] = useState<"layers" | "curves">("layers");

  // Collapsible panels
  const [bgOpen, setBgOpen] = useState(false);

  // Iframe readiness
  const [bgIframeReady, setBgIframeReady]   = useState(false);
  const [subIframeReady, setSubIframeReady] = useState(false);

  // Rendering refs
  const bgIframeRef        = useRef<HTMLIFrameElement>(null);
  const subIframeRef       = useRef<HTMLIFrameElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const hasCompositeRef    = useRef(false);
  const bgOffscreen        = useRef<HTMLCanvasElement | null>(null);
  const dragSrcIdxBg       = useRef<number | null>(null);

  // Per-subject offscreen canvases and render queue
  const subjectOffscreens      = useRef(new Map<string, HTMLCanvasElement>());
  const renderQueueRef         = useRef<string[]>([]);
  const renderingSubjectIdRef  = useRef<string | null>(null);
  const subIframeReadyRef      = useRef(false);

  // Subject drag
  const isDragging     = useRef(false);
  const draggingSubjId = useRef<string | null>(null);
  const dragStartPos   = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // Brush mask editing
  const maskEditRef           = useRef<MaskEditState | null>(null);
  const subjectOriginalAlphas = useRef(new Map<string, Float32Array>());
  const subjectCurrentAlphas  = useRef(new Map<string, Float32Array>());
  const brushPainting         = useRef(false);
  const brushCursorRef        = useRef<HTMLDivElement>(null);
  const lastBrushMousePos     = useRef<{ x: number; y: number } | null>(null);
  const [maskEditUI, setMaskEditUI] = useState<MaskEditUIState | null>(null);

  // Composite ready flag
  const [hasComposite, setHasComposite] = useState(false);

  // Export
  const [exporting, setExporting]     = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"webp" | "jpeg" | "png">("webp");
  const [compositeExportWidth, setCompositeExportWidth] = useState<string>("");

  // Overlay (global topmost layer)
  const [overlay, setOverlay] = useState<CompositeOverlay | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayLayers, dispatchOverlayLayers] = useReducer(layersReducer, []);
  const [overlayActiveLayerId, setOverlayActiveLayerId] = useState<string | null>(null);
  const [overlayShowPresetModal, setOverlayShowPresetModal] = useState(false);
  const overlayRef        = useRef<CompositeOverlay | null>(null);
  const overlayOffscreen  = useRef<HTMLCanvasElement | null>(null);
  const overlayIframeRef  = useRef<HTMLIFrameElement | null>(null);
  const overlayFileRef    = useRef<HTMLInputElement | null>(null);
  const dragSrcIdxOverlay = useRef<number | null>(null);
  const overlayDragging   = useRef(false);
  const overlayDragStart  = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const debouncedOverlayLayers = useDebouncedValue(overlayLayers, 300);

  const bgActiveLayer = bgLayers.find((l) => l.id === bgActiveLayerId) ?? bgLayers[0] ?? null;

  const debouncedBgLayers = useDebouncedValue(bgLayers,  300);
  const debouncedSubjects = useDebouncedValue(subjects,  300);

  subjectsRef.current      = subjects;
  activeSubjectIdRef.current = activeSubjectId;
  overlayRef.current       = overlay;
  const activeSubject      = subjects.find((s) => s.id === activeSubjectId) ?? subjects[0] ?? null;
  const overlayActiveLayer = overlayLayers.find((l) => l.id === overlayActiveLayerId) ?? overlayLayers[0] ?? null;

  // Sync bg active layer ID on removal
  useEffect(() => {
    if (!bgLayers.length) { setBgActiveLayerId(""); return; }
    if (!bgLayers.find((l) => l.id === bgActiveLayerId))
      setBgActiveLayerId(bgLayers[bgLayers.length - 1].id);
  }, [bgLayers, bgActiveLayerId]);

  // Sync overlay active layer ID on removal
  useEffect(() => {
    if (!overlayLayers.length) { setOverlayActiveLayerId(null); return; }
    if (!overlayLayers.find((l) => l.id === overlayActiveLayerId))
      setOverlayActiveLayerId(overlayLayers[overlayLayers.length - 1].id);
  }, [overlayLayers, overlayActiveLayerId]);

  // Sync active subject ID when subjects change
  useEffect(() => {
    if (!subjects.length) { setActiveSubjectId(null); return; }
    if (!subjects.find((s) => s.id === activeSubjectId))
      setActiveSubjectId(subjects[0].id);
  }, [subjects, activeSubjectId]);

  // ---------- Composite redraw ----------

  const redrawComposite = useCallback((forExport = false) => {
    const canvas = compositeCanvasRef.current;
    const bgC    = bgOffscreen.current;
    if (!canvas || !bgC || !bgC.width) return;
    canvas.width  = bgC.width;
    canvas.height = bgC.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const editState = maskEditRef.current;
    const editingId = !forExport && editState ? editState.subjectId : null;

    if (editingId) {
      ctx.globalAlpha = 0.4;
      ctx.drawImage(bgC, 0, 0);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(bgC, 0, 0);
    }

    const activeId  = activeSubjectIdRef.current;
    const allSubjs  = subjectsRef.current;
    for (const subj of allSubjs) {
      const subC = subjectOffscreens.current.get(subj.id);
      if (!subC || !subC.width) continue;
      const sW = subC.width  * subj.scale;
      const sH = subC.height * subj.scale;
      const sX = bgC.width  / 2 + subj.position.x - sW / 2;
      const sY = bgC.height / 2 + subj.position.y - sH / 2;

      if (editingId && subj.id !== editingId) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(subC, sX, sY, sW, sH);
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(subC, sX, sY, sW, sH);
        if (editingId && subj.id === editingId) {
          ctx.save();
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.strokeRect(sX + 1, sY + 1, sW - 2, sH - 2);
          ctx.restore();
        } else if (!forExport && subj.id === activeId && allSubjs.length > 1) {
          ctx.save();
          ctx.strokeStyle = "rgba(239, 108, 78, 0.7)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(sX + 1, sY + 1, sW - 2, sH - 2);
          ctx.restore();
        }
      }
    }

    // Global overlay, drawn last (topmost), with its own opacity.
    const ovl = overlayRef.current;
    const ovlC = overlayOffscreen.current;
    if (ovl && ovlC && ovlC.width) {
      const oW = ovlC.width * ovl.scale;
      const oH = ovlC.height * ovl.scale;
      const oX = bgC.width / 2 + ovl.position.x - oW / 2;
      const oY = bgC.height / 2 + ovl.position.y - oH / 2;
      ctx.globalAlpha = ovl.opacity;
      ctx.drawImage(ovlC, oX, oY, oW, oH);
      ctx.globalAlpha = 1;
    }

    if (!hasCompositeRef.current) {
      hasCompositeRef.current = true;
      setHasComposite(true);
    }
  }, []);

  const copyIframeCanvas = useCallback(
    (ref: React.RefObject<HTMLIFrameElement>, offscreen: React.MutableRefObject<HTMLCanvasElement | null>) => {
      const doc = ref.current?.contentDocument;
      if (!doc) return;
      const src = doc.getElementById("canvas") as HTMLCanvasElement | null;
      if (!src || !src.width || !src.height) return;
      if (!offscreen.current) offscreen.current = document.createElement("canvas");
      offscreen.current.width  = src.width;
      offscreen.current.height = src.height;
      const ctx = offscreen.current.getContext("2d");
      if (ctx) ctx.drawImage(src, 0, 0);
    },
    [],
  );

  const copySubIframeToSubject = useCallback((subjectId: string) => {
    const doc = subIframeRef.current?.contentDocument;
    if (!doc) return;
    const src = doc.getElementById("canvas") as HTMLCanvasElement | null;
    if (!src || !src.width || !src.height) return;
    let target = subjectOffscreens.current.get(subjectId);
    if (!target) { target = document.createElement("canvas"); subjectOffscreens.current.set(subjectId, target); }
    target.width  = src.width;
    target.height = src.height;
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(src, 0, 0);
    // Re-apply brush-edited alpha if present so filter re-renders don't destroy edits
    const editedAlpha = subjectCurrentAlphas.current.get(subjectId);
    if (editedAlpha && editedAlpha.length === src.width * src.height) {
      const imgData = ctx.getImageData(0, 0, src.width, src.height);
      for (let i = 0; i < editedAlpha.length; i++) {
        imgData.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, editedAlpha[i])) * 255);
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, []);

  // Subject render queue — processes subjects sequentially through the single sub iframe
  const processRenderQueue = useCallback(() => {
    if (renderingSubjectIdRef.current) return;
    if (!subIframeReadyRef.current) return;
    // Skip any subjects that have been removed
    let id: string | undefined;
    let subj: CompositeSubject | undefined;
    while ((id = renderQueueRef.current.shift()) !== undefined) {
      subj = subjectsRef.current.find((s) => s.id === id);
      if (subj) break;
    }
    if (!subj || !id) return;
    renderingSubjectIdRef.current = id;
    subIframeRef.current?.contentWindow?.postMessage(
      { type: "render", imageUrl: subj.isolatedPath, layers: subj.layers.map(layerMsg), seed: 1 },
      "*",
    );
  }, []);

  // Message handler
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "ready") {
        if (e.source === bgIframeRef.current?.contentWindow) setBgIframeReady(true);
        if (e.source === subIframeRef.current?.contentWindow) {
          subIframeReadyRef.current = true;
          setSubIframeReady(true);
        }
        if (e.source === overlayIframeRef.current?.contentWindow) {
          const ovl = overlayRef.current;
          if (ovl) {
            overlayIframeRef.current?.contentWindow?.postMessage(
              { type: "render", imageUrl: ovl.imagePath, layers: overlayLayers.map(layerMsg), seed: 1 },
              "*",
            );
          }
        }
      }
      if (e.data.type === "rendered") {
        if (e.source === bgIframeRef.current?.contentWindow) {
          copyIframeCanvas(bgIframeRef, bgOffscreen);
          redrawComposite();
        }
        if (e.source === overlayIframeRef.current?.contentWindow) {
          copyIframeCanvas(overlayIframeRef, overlayOffscreen);
          redrawComposite();
        }
        if (e.source === subIframeRef.current?.contentWindow) {
          const id = renderingSubjectIdRef.current;
          if (id) {
            if (subjectsRef.current.find((s) => s.id === id)) {
              copySubIframeToSubject(id);
            }
            renderingSubjectIdRef.current = null;
            processRenderQueue();
            redrawComposite();
          }
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [copyIframeCanvas, copySubIframeToSubject, redrawComposite, processRenderQueue, overlayLayers]);

  // Send bg render messages when layers/image change
  useEffect(() => {
    if (!bgIframeReady || !bgPath || currentStep !== 3) return;
    bgIframeRef.current?.contentWindow?.postMessage(
      { type: "render", imageUrl: bgPath, layers: debouncedBgLayers.map(layerMsg), seed: 1 },
      "*",
    );
  }, [bgIframeReady, bgPath, debouncedBgLayers, currentStep]);

  // Send overlay render messages when its layers/image change
  useEffect(() => {
    if (!overlay || !overlayIframeRef.current?.contentWindow) return;
    overlayIframeRef.current.contentWindow.postMessage(
      { type: "render", imageUrl: overlay.imagePath, layers: debouncedOverlayLayers.map(layerMsg), seed: 1 },
      "*",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedOverlayLayers, overlay?.imagePath]);

  // Enqueue subject re-renders when debounced subjects change
  useEffect(() => {
    if (!subIframeReady || currentStep !== 3) return;
    for (const subj of debouncedSubjects) {
      if (!renderQueueRef.current.includes(subj.id)) {
        renderQueueRef.current.push(subj.id);
      }
    }
    processRenderQueue();
  }, [debouncedSubjects, subIframeReady, currentStep, processRenderQueue]);

  // Flush queue when iframe becomes ready (catches subjects added before iframe loaded)
  useEffect(() => {
    if (subIframeReady) processRenderQueue();
  }, [subIframeReady, processRenderQueue]);

  useEffect(() => { redrawComposite(); }, [subjects, redrawComposite]);

  // Redraw when the overlay's opacity/scale/position (or presence) changes.
  useEffect(() => { redrawComposite(); }, [overlay, redrawComposite]);

  // ---------- Background upload ----------

  const onUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      setBgPath(await uploadFile(file));
    } finally {
      setUploadingBg(false);
    }
  };

  // ---------- Overlay upload ----------

  const onUploadOverlay = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imagePath = await uploadFile(file);
      setOverlay({ imagePath, layers: [], opacity: 1.0, position: { x: 0, y: 0 }, scale: 1.0 });
      dispatchOverlayLayers({ type: "restore", layers: [] });
      setOverlayOpen(true);
    } catch {
      // Upload errors are surfaced elsewhere; keep overlay unset on failure.
    } finally {
      // Allow re-selecting the same file later.
      if (overlayFileRef.current) overlayFileRef.current.value = "";
    }
  };

  // ---------- Advance to step 3 (called by Step2 on Continue) ----------

  const advanceToEdit = (isolatedPath: string) => {
    const id = `subj-${Date.now()}`;
    dispatchSubjects({ type: "add", subject: { id, name: "Subject 1", isolatedPath, layers: [], position: { x: 0, y: 0 }, scale: 1.0 } });
    setActiveSubjectId(id);
    setCurrentStep(3);
  };

  const addNewSubject = (isolatedPath: string) => {
    const n = subjectsRef.current.length + 1;
    const id = `subj-${Date.now()}`;
    dispatchSubjects({ type: "add", subject: { id, name: `Subject ${n}`, isolatedPath, layers: [], position: { x: 0, y: 0 }, scale: 1.0 } });
    setActiveSubjectId(id);
    setAddingSubject(false);
  };

  // ---------- Subject position / scale ----------

  const setActiveSubjectScale = (scale: number) => {
    const id = activeSubjectId ?? subjects[0]?.id;
    if (id) dispatchSubjects({ type: "set-scale", id, scale });
  };

  const resetActiveSubjectPosition = () => {
    const id = activeSubjectId ?? subjects[0]?.id;
    if (!id) return;
    dispatchSubjects({ type: "move", id, position: { x: 0, y: 0 } });
    dispatchSubjects({ type: "set-scale", id, scale: 1.0 });
  };

  // ---------- Mask brush edit callbacks ----------

  const applyAlphaToOffscreen = useCallback((subjectId: string, alpha: Float32Array) => {
    const canvas = subjectOffscreens.current.get(subjectId);
    if (!canvas || !canvas.width) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < alpha.length; i++) {
      imgData.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, alpha[i])) * 255);
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const enterMaskEdit = useCallback((subjectId: string) => {
    if (maskEditRef.current?.subjectId === subjectId) return;
    maskEditRef.current = null;
    const offscreen = subjectOffscreens.current.get(subjectId);
    if (!offscreen || !offscreen.width) return;
    if (!subjectOriginalAlphas.current.has(subjectId)) {
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
      const alpha = new Float32Array(offscreen.width * offscreen.height);
      for (let i = 0; i < alpha.length; i++) alpha[i] = imgData.data[i * 4 + 3] / 255;
      subjectOriginalAlphas.current.set(subjectId, alpha);
      if (!subjectCurrentAlphas.current.has(subjectId)) {
        subjectCurrentAlphas.current.set(subjectId, alpha.slice());
      }
    }
    maskEditRef.current = { subjectId, mode: "erase", brushSize: 20, brushHardness: 60, undoStack: [], redoStack: [] };
    setMaskEditUI({ subjectId, mode: "erase", brushSize: 20, brushHardness: 60, canUndo: false, canRedo: false });
    redrawComposite();
  }, [redrawComposite]);

  const exitMaskEdit = useCallback(() => {
    maskEditRef.current = null;
    brushPainting.current = false;
    if (brushCursorRef.current) brushCursorRef.current.style.display = "none";
    setMaskEditUI(null);
    redrawComposite();
  }, [redrawComposite]);

  const applyBrushAt = useCallback((canvasX: number, canvasY: number, displayScale: number) => {
    const edit = maskEditRef.current;
    if (!edit) return;
    const bgC = bgOffscreen.current;
    if (!bgC) return;
    const subj = subjectsRef.current.find((s) => s.id === edit.subjectId);
    if (!subj) return;
    const subC = subjectOffscreens.current.get(subj.id);
    if (!subC || !subC.width) return;
    const sW = subC.width  * subj.scale;
    const sH = subC.height * subj.scale;
    const sX = bgC.width  / 2 + subj.position.x - sW / 2;
    const sY = bgC.height / 2 + subj.position.y - sH / 2;
    const imgX = (canvasX - sX) / subj.scale;
    const imgY = (canvasY - sY) / subj.scale;
    const iW   = subC.width;
    const iH   = subC.height;
    const currentAlpha  = subjectCurrentAlphas.current.get(subj.id);
    const originalAlpha = subjectOriginalAlphas.current.get(subj.id);
    if (!currentAlpha || !originalAlpha) return;
    const brushRadiusPx = (edit.brushSize / 2) * displayScale / subj.scale;
    const radiusCeil    = Math.ceil(brushRadiusPx);
    const hardness      = edit.brushHardness / 100;
    const minPX = Math.max(0, Math.floor(imgX - radiusCeil));
    const maxPX = Math.min(iW - 1, Math.ceil(imgX + radiusCeil));
    const minPY = Math.max(0, Math.floor(imgY - radiusCeil));
    const maxPY = Math.min(iH - 1, Math.ceil(imgY + radiusCeil));
    for (let py = minPY; py <= maxPY; py++) {
      for (let px = minPX; px <= maxPX; px++) {
        const dist = Math.sqrt((px - imgX) ** 2 + (py - imgY) ** 2);
        if (dist > brushRadiusPx) continue;
        const t        = dist / brushRadiusPx;
        const strength = hardness * (t < 1 ? 1 : 0) + (1 - hardness) * Math.exp(-4 * t * t);
        const idx = py * iW + px;
        if (edit.mode === "erase") {
          currentAlpha[idx] = currentAlpha[idx] * (1 - strength);
        } else {
          currentAlpha[idx] = currentAlpha[idx] + (originalAlpha[idx] - currentAlpha[idx]) * strength;
        }
      }
    }
    const ctx = subC.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, iW, iH);
    for (let i = 0; i < currentAlpha.length; i++) {
      imgData.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, currentAlpha[i])) * 255);
    }
    ctx.putImageData(imgData, 0, 0);
    redrawComposite();
  }, [redrawComposite]);

  const maskUndo = useCallback(() => {
    const edit = maskEditRef.current;
    if (!edit || edit.undoStack.length === 0) return;
    const current = subjectCurrentAlphas.current.get(edit.subjectId);
    if (!current) return;
    edit.redoStack.push(current.slice());
    const prev = edit.undoStack.pop()!;
    subjectCurrentAlphas.current.set(edit.subjectId, prev);
    applyAlphaToOffscreen(edit.subjectId, prev);
    setMaskEditUI((u) => u ? { ...u, canUndo: edit.undoStack.length > 0, canRedo: true } : null);
    redrawComposite();
  }, [applyAlphaToOffscreen, redrawComposite]);

  const maskRedo = useCallback(() => {
    const edit = maskEditRef.current;
    if (!edit || edit.redoStack.length === 0) return;
    const current = subjectCurrentAlphas.current.get(edit.subjectId);
    if (!current) return;
    edit.undoStack.push(current.slice());
    const next = edit.redoStack.pop()!;
    subjectCurrentAlphas.current.set(edit.subjectId, next);
    applyAlphaToOffscreen(edit.subjectId, next);
    setMaskEditUI((u) => u ? { ...u, canUndo: true, canRedo: edit.redoStack.length > 0 } : null);
    redrawComposite();
  }, [applyAlphaToOffscreen, redrawComposite]);

  const setMaskEditMode = useCallback((mode: "erase" | "restore") => {
    if (!maskEditRef.current) return;
    maskEditRef.current.mode = mode;
    setMaskEditUI((prev) => prev ? { ...prev, mode } : null);
  }, []);

  const setMaskBrushSize = useCallback((brushSize: number) => {
    if (!maskEditRef.current) return;
    maskEditRef.current.brushSize = brushSize;
    setMaskEditUI((prev) => prev ? { ...prev, brushSize } : null);
    if (brushCursorRef.current && lastBrushMousePos.current) {
      const { x, y } = lastBrushMousePos.current;
      brushCursorRef.current.style.width  = `${brushSize}px`;
      brushCursorRef.current.style.height = `${brushSize}px`;
      brushCursorRef.current.style.left   = `${x - brushSize / 2}px`;
      brushCursorRef.current.style.top    = `${y - brushSize / 2}px`;
    }
  }, []);

  const setMaskBrushHardness = useCallback((brushHardness: number) => {
    if (!maskEditRef.current) return;
    maskEditRef.current.brushHardness = brushHardness;
    setMaskEditUI((prev) => prev ? { ...prev, brushHardness } : null);
  }, []);

  // Keyboard shortcuts for undo/redo (only when edit mode active)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!maskEditRef.current) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); maskUndo(); }
      if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); maskRedo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [maskUndo, maskRedo]);

  // ---------- Subject drag on composite canvas ----------

  const onPreviewMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const canvas = compositeCanvasRef.current;
      const bgC    = bgOffscreen.current;
      if (!canvas || !bgC) return;

      const rect   = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;

      // Edit mode — begin brush stroke
      if (maskEditRef.current) {
        e.preventDefault();
        const edit = maskEditRef.current;
        const current = subjectCurrentAlphas.current.get(edit.subjectId);
        if (current) {
          if (edit.undoStack.length >= 30) edit.undoStack.shift();
          edit.undoStack.push(current.slice());
          edit.redoStack.length = 0;
          setMaskEditUI((prev) => prev ? { ...prev, canUndo: true, canRedo: false } : null);
        }
        brushPainting.current = true;
        applyBrushAt(cx, cy, scaleX);
        return;
      }

      // Reverse-order hit test — last drawn (topmost) wins
      const allSubjects = subjectsRef.current;
      for (let i = allSubjects.length - 1; i >= 0; i--) {
        const subj = allSubjects[i];
        const subC = subjectOffscreens.current.get(subj.id);
        if (!subC || !subC.width) continue;
        const sW = subC.width  * subj.scale;
        const sH = subC.height * subj.scale;
        const sX = bgC.width  / 2 + subj.position.x - sW / 2;
        const sY = bgC.height / 2 + subj.position.y - sH / 2;
        if (cx >= sX && cx <= sX + sW && cy >= sY && cy <= sY + sH) {
          e.preventDefault();
          isDragging.current = true;
          draggingSubjId.current = subj.id;
          setActiveSubjectId(subj.id);
          dragStartPos.current = { mx: e.clientX, my: e.clientY, ox: subj.position.x, oy: subj.position.y };
          return;
        }
      }

      // Overlay hit test (topmost) — only reached if no subject was hit.
      const ovl = overlayRef.current;
      const ovlC = overlayOffscreen.current;
      if (ovl && ovlC && ovlC.width) {
        const oW = ovlC.width  * ovl.scale;
        const oH = ovlC.height * ovl.scale;
        const oX = bgC.width  / 2 + ovl.position.x - oW / 2;
        const oY = bgC.height / 2 + ovl.position.y - oH / 2;
        if (cx >= oX && cx <= oX + oW && cy >= oY && cy <= oY + oH) {
          e.preventDefault();
          overlayDragging.current = true;
          overlayDragStart.current = { mx: e.clientX, my: e.clientY, ox: ovl.position.x, oy: ovl.position.y };
          return;
        }
      }

      // No subject hit — deselect and remove the outline immediately
      activeSubjectIdRef.current = null;
      setActiveSubjectId(null);
      redrawComposite();
    },
    [redrawComposite, applyBrushAt],
  );

  const onPreviewMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Edit mode — continue brush stroke and update cursor
      if (maskEditRef.current) {
        if (brushPainting.current) {
          const canvas = compositeCanvasRef.current;
          if (canvas) {
            const rect   = canvas.getBoundingClientRect();
            const scaleX = canvas.width  / rect.width;
            const scaleY = canvas.height / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top)  * scaleY;
            applyBrushAt(cx, cy, scaleX);
          }
        }
        lastBrushMousePos.current = { x: e.clientX, y: e.clientY };
        const size = maskEditRef.current.brushSize;
        if (brushCursorRef.current) {
          brushCursorRef.current.style.display = "block";
          brushCursorRef.current.style.left   = `${e.clientX - size / 2}px`;
          brushCursorRef.current.style.top    = `${e.clientY - size / 2}px`;
          brushCursorRef.current.style.width  = `${size}px`;
          brushCursorRef.current.style.height = `${size}px`;
        }
        e.preventDefault();
        return;
      }

      // Overlay drag
      if (overlayDragging.current && overlayDragStart.current) {
        e.preventDefault();
        const canvas = compositeCanvasRef.current;
        if (!canvas) return;
        const rect   = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        const dx = (e.clientX - overlayDragStart.current.mx) * scaleX;
        const dy = (e.clientY - overlayDragStart.current.my) * scaleY;
        const nx = overlayDragStart.current.ox + dx;
        const ny = overlayDragStart.current.oy + dy;
        setOverlay((prev) => prev ? { ...prev, position: { x: nx, y: ny } } : null);
        redrawComposite();
        return;
      }

      if (!isDragging.current || !dragStartPos.current || !draggingSubjId.current) return;
      e.preventDefault();
      const canvas = compositeCanvasRef.current;
      if (!canvas) return;
      const rect   = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const dx = (e.clientX - dragStartPos.current.mx) * scaleX;
      const dy = (e.clientY - dragStartPos.current.my) * scaleY;
      dispatchSubjects({
        type: "move",
        id: draggingSubjId.current,
        position: { x: dragStartPos.current.ox + dx, y: dragStartPos.current.oy + dy },
      });
    },
    [applyBrushAt, redrawComposite],
  );

  const onPreviewMouseUp = useCallback(() => {
    if (maskEditRef.current) {
      brushPainting.current = false;
      return;
    }
    isDragging.current = false;
    draggingSubjId.current = null;
    dragStartPos.current = null;
    overlayDragging.current = false;
    overlayDragStart.current = null;
  }, []);

  const onPreviewMouseLeave = useCallback(() => {
    if (maskEditRef.current) {
      brushPainting.current = false;
      if (brushCursorRef.current) brushCursorRef.current.style.display = "none";
      return;
    }
    isDragging.current = false;
    draggingSubjId.current = null;
    dragStartPos.current = null;
    overlayDragging.current = false;
    overlayDragStart.current = null;
  }, []);

  // ---------- Export ----------

  const onExportComposite = () => {
    const canvas = compositeCanvasRef.current;
    if (!canvas || !canvas.width) return;
    const mime =
      exportFormat === "jpeg" ? "image/jpeg"
      : exportFormat === "png" ? "image/png"
      : "image/webp";
    const ext = exportFormat === "jpeg" ? "jpg" : exportFormat;
    setExporting(true);
    setExportError(null);
    redrawComposite(true);

    const sourceCanvas = compositeCanvasRef.current;
    if (!sourceCanvas) return;

    const targetWidth = compositeExportWidth ? Number(compositeExportWidth) : null;

    let exportCanvas: HTMLCanvasElement;
    if (targetWidth && targetWidth > 0 && targetWidth !== sourceCanvas.width) {
      const ratio = targetWidth / sourceCanvas.width;
      const targetHeight = Math.round(sourceCanvas.height * ratio);
      exportCanvas = document.createElement("canvas");
      exportCanvas.width = targetWidth;
      exportCanvas.height = targetHeight;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    } else {
      exportCanvas = sourceCanvas;
    }

    exportCanvas.toBlob(
      (blob) => {
        redrawComposite(false);
        setExporting(false);
        if (!blob) { setExportError("Export failed — canvas was empty."); return; }
        const objectUrl = URL.createObjectURL(blob);
        onExportReady(objectUrl, `composite.${ext}`);
      },
      mime,
      0.92,
    );
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="flex-1 flex flex-col bg-ink-900 overflow-y-auto">
      {/* Brush cursor circle — fixed-positioned, updated via ref */}
      <div
        ref={brushCursorRef}
        className="fixed pointer-events-none rounded-full border-2 border-white/80"
        style={{ display: "none", zIndex: 9999, boxSizing: "border-box" }}
      />
      {/* Hidden rendering iframes — off-screen so WebGL context stays alive */}
      {currentStep === 3 && (
        <>
          <iframe
            ref={bgIframeRef}
            src="/render.html"
            title="Background render"
            onLoad={() => setBgIframeReady(true)}
            style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px" }}
          />
          <iframe
            ref={subIframeRef}
            src="/render.html"
            title="Subject render"
            onLoad={() => setSubIframeReady(true)}
            style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px" }}
          />
          <iframe
            ref={overlayIframeRef}
            src="/render.html"
            title="overlay-renderer"
            style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px" }}
          />
        </>
      )}

      <StepIndicator currentStep={currentStep} />

      {currentStep === 1 && (
        <Step1
          bgPath={bgPath}
          uploading={uploadingBg}
          onUpload={onUploadBackground}
          onContinue={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 2 && (
        <Step2
          bgPath={bgPath}
          onBack={() => setCurrentStep(1)}
          onContinue={advanceToEdit}
        />
      )}

      {currentStep === 3 && (
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL */}
          <aside className="w-[380px] shrink-0 bg-ink-800 border-r border-ink-600 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-600 flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setCurrentStep(2)} className="text-xs text-ink-200 hover:text-ink-100 transition">
                ← Back
              </button>
              <span className="text-xs text-ink-100">Edit & Composite</span>
            </div>

            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              {/* Background stack */}
              <CollapsibleStack title="Background" layerCount={bgLayers.length} open={bgOpen} onToggle={() => setBgOpen((v) => !v)}>
                <StackTabs tab={bgPanelTab} onTabChange={setBgPanelTab} />
                {bgPanelTab === "layers" && (
                  <>
                    <LayerStack
                      layers={bgLayers} activeLayerId={bgActiveLayerId}
                      onSelect={setBgActiveLayerId}
                      onRemove={(id) => dispatchBg({ type: "remove", id })}
                      onToggleVisible={(id) => dispatchBg({ type: "toggle-visible", id })}
                      onSetIntensity={(id, intensity) => dispatchBg({ type: "set-intensity", id, intensity })}
                      onSetMask={(id, mask) => dispatchBg({ type: "set-mask", id, mask })}
                      onReorder={(from, to) => dispatchBg({ type: "reorder", from, to })}
                      dragSrcIdx={dragSrcIdxBg}
                    />
                    <AddLayerButton count={bgLayers.length} onClick={() => setBgShowPresetModal(true)} />
                    {bgActiveLayer && (
                      <div className="mt-4">
                        <p className="text-[11px] uppercase tracking-wider text-ink-200 mb-2">Fine Tuning</p>
                        <FineTuningPanel
                          key={bgActiveLayer.id}
                          preset={PRESETS_BY_ID[bgActiveLayer.preset]}
                          params={bgActiveLayer.params}
                          setParams={(p) => dispatchBg({ type: "set-params", id: bgActiveLayer.id, params: p })}
                        />
                      </div>
                    )}
                  </>
                )}
                {bgPanelTab === "curves" && bgActiveLayer ? (
                  <CurvesPanel key={bgActiveLayer.id} curves={bgActiveLayer.curves} onUpdate={(c) => dispatchBg({ type: "set-curves", id: bgActiveLayer.id, curves: c })} />
                ) : bgPanelTab === "curves" ? (
                  <p className="text-xs text-ink-200 text-center py-4">Select a layer to edit its curves.</p>
                ) : null}
              </CollapsibleStack>

              {/* Subjects section */}
              <div className="rounded-md border border-ink-600 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-ink-700/60">
                  <span className="flex-1 text-xs font-semibold text-ink-100">Subjects ({subjects.length}/5)</span>
                  <button
                    type="button"
                    disabled={subjects.length >= 5}
                    onClick={() => setAddingSubject(true)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded border border-accent-500/50 text-accent-400 hover:bg-accent-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    + Add Subject
                  </button>
                </div>
                {subjects.map((subj) => (
                  <SubjectPanel
                    key={subj.id}
                    subject={subj}
                    isActive={subj.id === activeSubjectId}
                    onActivate={() => setActiveSubjectId(subj.id)}
                    onRename={(name) => dispatchSubjects({ type: "rename", id: subj.id, name })}
                    onRemove={() => {
                      subjectOffscreens.current.delete(subj.id);
                      subjectOriginalAlphas.current.delete(subj.id);
                      subjectCurrentAlphas.current.delete(subj.id);
                      renderQueueRef.current = renderQueueRef.current.filter((qid) => qid !== subj.id);
                      if (maskEditRef.current?.subjectId === subj.id) {
                        maskEditRef.current = null;
                        brushPainting.current = false;
                        if (brushCursorRef.current) brushCursorRef.current.style.display = "none";
                        setMaskEditUI(null);
                      }
                      dispatchSubjects({ type: "remove", id: subj.id });
                    }}
                    onLayerAction={(action) => dispatchSubjects({ type: "layer", id: subj.id, action })}
                    canRemove={true}
                    onEditMask={() => enterMaskEdit(subj.id)}
                    isMaskEditing={maskEditUI?.subjectId === subj.id}
                  />
                ))}
              </div>

              {/* Overlay section */}
              <div className="rounded-md border border-ink-600 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-ink-700/60">
                  <span className="flex-1 text-xs font-semibold text-ink-100">Overlay</span>
                  {!overlay ? (
                    <>
                      <input
                        ref={overlayFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={onUploadOverlay}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => overlayFileRef.current?.click()}
                        className="text-[11px] font-medium px-2 py-0.5 rounded border border-accent-500/50 text-accent-400 hover:bg-accent-500/10 transition"
                      >
                        + Upload
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOverlay(null);
                        dispatchOverlayLayers({ type: "restore", layers: [] });
                        overlayOffscreen.current = null;
                        redrawComposite();
                      }}
                      className="text-ink-200 hover:text-red-400 transition text-base leading-none shrink-0"
                      title="Remove overlay"
                      aria-label="Remove overlay"
                    >
                      ×
                    </button>
                  )}
                  <button type="button" onClick={() => setOverlayOpen((v) => !v)} className="shrink-0">
                    <ChevronIcon open={overlayOpen} />
                  </button>
                </div>
                {overlayOpen && overlay && (
                  <div className="p-3 border-t border-ink-600 bg-ink-800">
                    <label className="flex items-center gap-2 text-xs text-ink-200 px-4 py-2">
                      Opacity
                      <input
                        type="range" min={0} max={100} step={1}
                        value={Math.round((overlay?.opacity ?? 1) * 100)}
                        onChange={(e) => {
                          const op = Number(e.target.value) / 100;
                          setOverlay(prev => prev ? { ...prev, opacity: op } : null);
                          redrawComposite();
                        }}
                        className="flex-1"
                      />
                      <span className="tabular-nums w-8 text-right">{Math.round((overlay?.opacity ?? 1) * 100)}%</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink-200 px-4 py-2">
                      Scale
                      <input
                        type="range" min={20} max={200} step={1}
                        value={Math.round((overlay?.scale ?? 1) * 100)}
                        onChange={(e) => {
                          const sc = Number(e.target.value) / 100;
                          setOverlay(prev => prev ? { ...prev, scale: sc } : null);
                          redrawComposite();
                        }}
                        className="flex-1"
                      />
                      <span className="tabular-nums w-8 text-right">{Math.round((overlay?.scale ?? 1) * 100)}%</span>
                    </label>
                    <LayerStack
                      layers={overlayLayers} activeLayerId={overlayActiveLayerId ?? ""}
                      onSelect={setOverlayActiveLayerId}
                      onRemove={(id) => dispatchOverlayLayers({ type: "remove", id })}
                      onToggleVisible={(id) => dispatchOverlayLayers({ type: "toggle-visible", id })}
                      onSetIntensity={(id, intensity) => dispatchOverlayLayers({ type: "set-intensity", id, intensity })}
                      onSetMask={(id, mask) => dispatchOverlayLayers({ type: "set-mask", id, mask })}
                      onReorder={(from, to) => dispatchOverlayLayers({ type: "reorder", from, to })}
                      dragSrcIdx={dragSrcIdxOverlay}
                    />
                    <AddLayerButton count={overlayLayers.length} onClick={() => setOverlayShowPresetModal(true)} />
                    {overlayActiveLayer && (
                      <div className="mt-4">
                        <p className="text-[11px] uppercase tracking-wider text-ink-200 mb-2">Fine Tuning</p>
                        <FineTuningPanel
                          key={overlayActiveLayer.id}
                          preset={PRESETS_BY_ID[overlayActiveLayer.preset]}
                          params={overlayActiveLayer.params}
                          setParams={(p) => dispatchOverlayLayers({ type: "set-params", id: overlayActiveLayer.id, params: p })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Export */}
            <div className="p-4 border-t border-ink-600 shrink-0">
              <div className="mb-3">
                <label className="block text-xs text-ink-200 mb-1">
                  Width (px) <span className="text-ink-200">— leave blank to export at original size</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={compositeExportWidth}
                  onChange={(e) => setCompositeExportWidth(e.target.value)}
                  placeholder="Original size"
                  className="w-full bg-ink-800 border border-ink-600 rounded-md px-3 py-1.5 text-sm text-ink-100 placeholder:text-ink-200 focus:outline-none focus:border-accent-500 transition"
                />
              </div>
              <div role="group" aria-label="Export format" className="flex gap-1 mb-2">
                {(["webp", "jpeg", "png"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => { setExportFormat(fmt); setExportError(null); }}
                    className={[
                      "flex-1 text-xs uppercase py-1.5 rounded-md border transition",
                      exportFormat === fmt
                        ? "border-accent-500 bg-ink-700 text-white"
                        : "border-ink-600 bg-ink-700/60 text-ink-200 hover:border-ink-400",
                    ].join(" ")}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!hasComposite || exporting}
                onClick={onExportComposite}
                className="w-full rounded-md bg-accent-500 hover:bg-accent-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 transition shadow-[0_0_12px_rgba(239,108,78,0.25)]"
              >
                {exporting ? "Exporting…" : "Export Composite"}
              </button>
              {exportError && <p className="text-xs text-red-400 mt-2">{exportError}</p>}
            </div>
          </aside>

          {/* RIGHT PANEL — composite preview */}
          <section className="flex-1 min-w-0 bg-ink-900 flex flex-col overflow-hidden">
            <div className="border-b border-ink-600 px-6 flex items-center justify-between shrink-0 min-h-[72px]">
              <span className="text-xs uppercase tracking-wider text-ink-200">Composite Preview</span>
              {activeSubject && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-ink-200">
                      Scale
                      <input
                        type="range" min={20} max={200} step={1}
                        value={Math.round(activeSubject.scale * 100)}
                        onChange={(e) => setActiveSubjectScale(Number(e.target.value) / 100)}
                        className="w-28"
                      />
                      <span className="tabular-nums w-8 text-right">{Math.round(activeSubject.scale * 100)}%</span>
                    </label>
                    <button type="button" onClick={resetActiveSubjectPosition} className="text-xs text-ink-200 hover:text-ink-100 transition">
                      Reset Position
                    </button>
                  </div>
                  {(() => {
                    const subCanvas = subjectOffscreens.current.get(activeSubject.id);
                    const naturalWidth = subCanvas?.width ?? null;
                    const naturalHeight = subCanvas?.height ?? null;
                    const displayWidth = naturalWidth ? Math.round(naturalWidth * activeSubject.scale) : null;
                    const displayHeight = naturalHeight ? Math.round(naturalHeight * activeSubject.scale) : null;
                    return (
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-ink-200 shrink-0">W (px)</label>
                        <input
                          type="number"
                          min={1}
                          value={displayWidth ?? ""}
                          onChange={(e) => {
                            if (!naturalWidth) return;
                            const newW = Number(e.target.value);
                            if (newW > 0) setActiveSubjectScale(newW / naturalWidth);
                          }}
                          className="w-24 bg-ink-800 border border-ink-600 rounded px-2 py-1 text-xs text-ink-100 focus:outline-none focus:border-accent-500 transition"
                        />
                        {displayHeight && (
                          <span className="text-xs text-ink-200">× {displayHeight}px</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_#1a1a20_0%,_#0b0b0d_70%)]">
              {maskEditUI && (
                <BrushToolbar
                  mode={maskEditUI.mode}
                  brushSize={maskEditUI.brushSize}
                  brushHardness={maskEditUI.brushHardness}
                  canUndo={maskEditUI.canUndo}
                  canRedo={maskEditUI.canRedo}
                  onModeChange={setMaskEditMode}
                  onSizeChange={setMaskBrushSize}
                  onHardnessChange={setMaskBrushHardness}
                  onUndo={maskUndo}
                  onRedo={maskRedo}
                  onDone={exitMaskEdit}
                />
              )}
              <canvas
                ref={compositeCanvasRef}
                className={hasComposite ? "max-w-full max-h-full object-contain select-none" : "hidden"}
                style={{ cursor: maskEditUI ? "none" : (activeSubject ? "grab" : "default") }}
                onMouseDown={onPreviewMouseDown}
                onMouseMove={onPreviewMouseMove}
                onMouseUp={onPreviewMouseUp}
                onMouseLeave={onPreviewMouseLeave}
              />
              {!hasComposite && (
                <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4a4a57" strokeWidth="1.2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p className="text-sm text-ink-200">Rendering composite…</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Preset modals */}
      {bgShowPresetModal && (
        <PresetModal onClose={() => setBgShowPresetModal(false)} onSelect={(id) => {
          const lid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          dispatchBg({ type: "add", preset: id, id: lid });
          setBgActiveLayerId(lid);
          setBgShowPresetModal(false);
        }} />
      )}
      {overlayShowPresetModal && (
        <PresetModal onClose={() => setOverlayShowPresetModal(false)} onSelect={(id) => {
          const lid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          dispatchOverlayLayers({ type: "add", preset: id, id: lid });
          setOverlayActiveLayerId(lid);
          setOverlayShowPresetModal(false);
        }} />
      )}
      {addingSubject && (
        <AddSubjectOverlay
          bgPath={bgPath}
          onAdd={addNewSubject}
          onCancel={() => setAddingSubject(false)}
        />
      )}
    </div>
  );
}

// Serialise a FilterLayer for postMessage
function layerMsg(l: FilterLayer) {
  return { preset: l.preset, visible: l.visible, intensity: l.intensity, params: l.params, mask: l.mask, curves: l.curves };
}

// ============================================================
// Brush Toolbar — floating overlay in edit mode
// ============================================================

function BrushToolbar({
  mode, brushSize, brushHardness, canUndo, canRedo,
  onModeChange, onSizeChange, onHardnessChange, onUndo, onRedo, onDone,
}: {
  mode: "erase" | "restore";
  brushSize: number;
  brushHardness: number;
  canUndo: boolean;
  canRedo: boolean;
  onModeChange: (m: "erase" | "restore") => void;
  onSizeChange: (v: number) => void;
  onHardnessChange: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
}) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-ink-800/95 border border-ink-600 rounded-lg px-4 py-2 shadow-lg backdrop-blur-sm select-none">
      <div className="flex gap-1">
        {(["erase", "restore"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={["text-xs px-2.5 py-1 rounded border capitalize transition",
              mode === m ? "bg-accent-500/20 border-accent-500 text-accent-400" : "border-ink-500 text-ink-200 hover:text-ink-100",
            ].join(" ")}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="w-px h-5 bg-ink-600" />
      <label className="flex items-center gap-2 text-xs text-ink-200">
        Size
        <input type="range" min={1} max={100} step={1} value={brushSize} onChange={(e) => onSizeChange(Number(e.target.value))} className="w-20" />
        <span className="tabular-nums w-6 text-right">{brushSize}</span>
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-200">
        Hardness
        <input type="range" min={0} max={100} step={1} value={brushHardness} onChange={(e) => onHardnessChange(Number(e.target.value))} className="w-20" />
        <span className="tabular-nums w-6 text-right">{brushHardness}</span>
      </label>
      <div className="w-px h-5 bg-ink-600" />
      <div className="flex gap-1">
        <button type="button" disabled={!canUndo} onClick={onUndo} title="Undo (Cmd+Z)"
          className="text-sm text-ink-200 hover:text-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition px-1">
          ←
        </button>
        <button type="button" disabled={!canRedo} onClick={onRedo} title="Redo (Cmd+Shift+Z)"
          className="text-sm text-ink-200 hover:text-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition px-1">
          →
        </button>
      </div>
      <div className="w-px h-5 bg-ink-600" />
      <button type="button" onClick={onDone}
        className="text-xs font-medium px-3 py-1 rounded bg-accent-500/20 border border-accent-500/60 text-accent-400 hover:bg-accent-500/30 transition">
        Done
      </button>
    </div>
  );
}

// ============================================================
// Subject Panel — per-subject collapsible layer editor
// ============================================================

function SubjectPanel({
  subject, isActive, onActivate, onRename, onRemove, onLayerAction, canRemove, onEditMask, isMaskEditing,
}: {
  subject: CompositeSubject;
  isActive: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onLayerAction: (action: LayerAction) => void;
  canRemove: boolean;
  onEditMask: () => void;
  isMaskEditing: boolean;
}) {
  const [open, setOpen]               = useState(true);
  const [tab, setTab]                 = useState<"layers" | "curves">("layers");
  const [activeLayerId, setActiveLayerId] = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [renaming, setRenaming]       = useState(false);
  const [nameValue, setNameValue]     = useState(subject.name);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const dragSrcIdx  = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeLayer = subject.layers.find((l) => l.id === activeLayerId) ?? subject.layers[0] ?? null;

  useEffect(() => {
    if (!subject.layers.length) { setActiveLayerId(""); return; }
    if (!subject.layers.find((l) => l.id === activeLayerId))
      setActiveLayerId(subject.layers[subject.layers.length - 1].id);
  }, [subject.layers, activeLayerId]);

  useEffect(() => { setNameValue(subject.name); }, [subject.name]);

  const commitRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== subject.name) onRename(trimmed);
    else setNameValue(subject.name);
    setRenaming(false);
  };

  return (
    <div className={["border-t border-ink-600", isActive ? "bg-ink-800 ring-1 ring-inset ring-accent-500/30" : "bg-ink-800/60"].join(" ")}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={onActivate}>
        {renaming ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setNameValue(subject.name); setRenaming(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs bg-ink-700 border border-accent-500/50 rounded px-1.5 py-0.5 text-ink-100 outline-none"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-xs text-ink-100 truncate select-none"
            onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); setTimeout(() => nameInputRef.current?.select(), 0); }}
            title="Double-click to rename"
          >
            {subject.name}
          </span>
        )}
        {subject.layers.length > 0 && (
          <span className="text-[10px] font-bold bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-full px-1.5 py-px leading-none shrink-0">
            {subject.layers.length}
          </span>
        )}
        {!renaming && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditMask(); }}
            className={["text-[10px] font-medium px-1.5 py-0.5 rounded border transition shrink-0",
              isMaskEditing
                ? "border-white text-white bg-white/10"
                : "border-ink-500 text-ink-200 hover:text-ink-100 hover:border-ink-300",
            ].join(" ")}
            title="Edit mask with brush"
          >
            Edit Mask
          </button>
        )}
        {canRemove && !renaming && (
          confirmRemove ? (
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => { onRemove(); setConfirmRemove(false); }}
                className="text-[10px] text-red-400 hover:text-red-300 border border-red-800 rounded px-1.5 py-0.5 transition">
                Delete
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)}
                className="text-[10px] text-ink-200 hover:text-ink-100 transition">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmRemove(true); }}
              className="text-ink-100 hover:text-red-400 transition shrink-0" title="Remove subject">
              <TrashIcon />
            </button>
          )
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="shrink-0">
          <ChevronIcon open={open} />
        </button>
      </div>

      {/* Body */}
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-ink-600/50">
          <StackTabs tab={tab} onTabChange={setTab} />
          {tab === "layers" && (
            <>
              <LayerStack
                layers={subject.layers} activeLayerId={activeLayerId}
                onSelect={setActiveLayerId}
                onRemove={(id) => onLayerAction({ type: "remove", id })}
                onToggleVisible={(id) => onLayerAction({ type: "toggle-visible", id })}
                onSetIntensity={(id, intensity) => onLayerAction({ type: "set-intensity", id, intensity })}
                onSetMask={(id, mask) => onLayerAction({ type: "set-mask", id, mask })}
                onReorder={(from, to) => onLayerAction({ type: "reorder", from, to })}
                dragSrcIdx={dragSrcIdx}
              />
              <AddLayerButton count={subject.layers.length} onClick={() => setShowModal(true)} />
              {activeLayer && (
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wider text-ink-200 mb-2">Fine Tuning</p>
                  <FineTuningPanel
                    key={activeLayer.id}
                    preset={PRESETS_BY_ID[activeLayer.preset]}
                    params={activeLayer.params}
                    setParams={(p) => onLayerAction({ type: "set-params", id: activeLayer.id, params: p })}
                  />
                </div>
              )}
            </>
          )}
          {tab === "curves" && activeLayer ? (
            <CurvesPanel
              key={activeLayer.id}
              curves={activeLayer.curves}
              onUpdate={(c) => onLayerAction({ type: "set-curves", id: activeLayer.id, curves: c })}
            />
          ) : tab === "curves" ? (
            <p className="text-xs text-ink-200 text-center py-4">Select a layer to edit its curves.</p>
          ) : null}
        </div>
      )}

      {showModal && (
        <PresetModal
          onClose={() => setShowModal(false)}
          onSelect={(id) => {
            const lid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            onLayerAction({ type: "add", preset: id, id: lid });
            setActiveLayerId(lid);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Add Subject Overlay — modal with mini Step 2 flow
// ============================================================

function AddSubjectOverlay({
  bgPath, onAdd, onCancel,
}: {
  bgPath: string | null;
  onAdd: (isolatedPath: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-ink-800 border border-ink-600 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Step2
          bgPath={bgPath}
          onBack={onCancel}
          onContinue={onAdd}
          ctaLabel="Add to Composite"
          backLabel="← Cancel"
        />
      </div>
    </div>
  );
}

// ============================================================
// Step indicator
// ============================================================

function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = ["Upload Background", "Upload Subject", "Edit & Composite"];
  return (
    <div className="shrink-0 sticky top-0 z-10 flex items-center justify-center gap-3 py-4 border-b border-ink-700 bg-ink-800">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === currentStep;
        const done   = n < currentStep;
        return (
          <div key={n} className="flex items-center gap-2">
            {i > 0 && <span className="w-8 h-px bg-ink-600" />}
            <div className="flex items-center gap-2">
              <span className={["w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition",
                active ? "bg-accent-500 text-white" : done ? "bg-ink-600 text-ink-200" : "bg-ink-700 text-ink-200"].join(" ")}>
                {done ? "✓" : n}
              </span>
              <span className={["text-xs font-medium", active ? "text-ink-100" : "text-ink-200"].join(" ")}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Step 1 — upload background
// ============================================================

function Step1({
  bgPath, uploading, onUpload, onContinue,
}: {
  bgPath: string | null;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-md">
        <h2 className="text-sm font-semibold text-ink-100 mb-1 text-center">Upload Background Image</h2>
        <p className="text-xs text-ink-200 mb-6 text-center">This will be the base of your composite. Supports JPEG, PNG, WebP.</p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} className="hidden" />
        {bgPath ? (
          <div className="rounded-xl border border-ink-600 bg-ink-800 p-4 flex flex-col items-center gap-3">
            <img src={bgPath} alt="Background preview" className="max-h-48 rounded object-contain" />
            <div className="flex gap-2 w-full">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 rounded-md bg-ink-600 text-ink-100 text-xs py-2 hover:bg-ink-500 transition">
                Replace
              </button>
              <button type="button" onClick={onContinue} className="flex-1 rounded-md bg-accent-500 hover:bg-accent-400 text-white text-xs font-semibold py-2 transition">
                Continue →
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full rounded-xl border-2 border-dashed border-ink-600 hover:border-ink-400 bg-ink-800/50 text-ink-200 hover:text-ink-100 py-12 flex flex-col items-center gap-3 transition disabled:opacity-60"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="text-sm">{uploading ? "Uploading…" : "Click to upload background"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Step 2 — upload subject + bounding-box selection + bg removal
// ============================================================

type Step2SubMode = "upload" | "selecting" | "processing" | "done" | "error";

function Step2({
  bgPath, onBack, onContinue, ctaLabel = "Continue →", backLabel = "← Back to Background",
}: {
  bgPath: string | null;
  onBack: () => void;
  onContinue: (isolatedPath: string) => void;
  ctaLabel?: string;
  backLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]               = useState<File | null>(null);
  const [origBlobUrl, setOrigBlobUrl] = useState<string | null>(null);
  const [selBox, setSelBox]           = useState<BBox | null>(null);
  const [mode, setMode]               = useState<Step2SubMode>("upload");
  const [isolatedBlobUrl, setIsolatedBlobUrl] = useState<string | null>(null);
  const [isolatedPath, setIsolatedPath]       = useState<string | null>(null);
  const [errorMsg, setErrorMsg]               = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (origBlobUrl) URL.revokeObjectURL(origBlobUrl);
    setFile(f);
    setOrigBlobUrl(URL.createObjectURL(f));
    setSelBox(null);
    setIsolatedBlobUrl(null);
    setIsolatedPath(null);
    setErrorMsg(null);
    setMode("selecting");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemoveBg = async () => {
    if (!file || !selBox || !origBlobUrl) return;
    setMode("processing");
    setErrorMsg(null);
    try {
      // Load original image
      const img = await loadImage(origBlobUrl);

      // Crop to selection bounding box
      const cropW = Math.round(Math.max(1, selBox.w));
      const cropH = Math.round(Math.max(1, selBox.h));
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width  = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) throw new Error("Could not get canvas 2D context");
      cropCtx.drawImage(img, Math.round(selBox.x), Math.round(selBox.y), cropW, cropH, 0, 0, cropW, cropH);
      const cropBlob = await canvasToBlob(cropCanvas);

      // Run background removal on the crop
      const { removeBackground } = await import("@imgly/background-removal");
      const isolatedCrop = await removeBackground(cropBlob);
      const processedCrop = await processIsolatedSubject(isolatedCrop);

      // Show preview
      setIsolatedBlobUrl(URL.createObjectURL(processedCrop));

      // Upload isolated PNG so the render iframe can load it by server URL
      const uploaded = await uploadFile(
        new File([processedCrop], "subject-isolated.png", { type: "image/png" }),
      );
      setIsolatedPath(uploaded);
      setMode("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Background removal failed.");
      setMode("error");
    }
  };

  const handleRedraw = () => {
    setSelBox(null);
    setIsolatedBlobUrl(null);
    setIsolatedPath(null);
    setErrorMsg(null);
    setMode("selecting");
  };

  const subModeLabel: Record<Step2SubMode, string> = {
    upload:     "Upload your subject image, then draw a selection around it.",
    selecting:  "Draw a box around the subject, then click Remove Background.",
    processing: "Removing background…",
    done:       "Background removed. Continue when ready.",
    error:      "An error occurred. Try again.",
  };

  return (
    <div className="flex-1 flex flex-col items-center py-8 px-4 overflow-y-auto">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {bgPath && (
            <img src={bgPath} alt="Background" className="w-14 h-14 object-cover rounded border border-ink-600 shrink-0" />
          )}
          <div>
            <h2 className="text-sm font-semibold text-ink-100 mb-0.5">Upload &amp; Select Subject</h2>
            <p className="text-xs text-ink-200">{subModeLabel[mode]}</p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />

        {/* Upload zone */}
        {mode === "upload" && (
          <button
            type="button" onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-ink-600 hover:border-ink-400 bg-ink-800/50 text-ink-200 hover:text-ink-100 py-12 flex flex-col items-center gap-3 transition"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-sm">Click to upload subject image</span>
          </button>
        )}

        {/* Selection canvas */}
        {mode === "selecting" && origBlobUrl && (
          <div className="space-y-3">
            <SelectionCanvas imageSrc={origBlobUrl} box={selBox} onBoxChange={setSelBox} />
            <p className="text-xs text-ink-100">Click and drag to draw a selection. Drag the handles to resize it.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 rounded-md bg-ink-600 text-ink-100 text-xs py-2 hover:bg-ink-500 transition">
                Replace Image
              </button>
              <button
                type="button"
                disabled={!selBox || selBox.w < 5 || selBox.h < 5}
                onClick={handleRemoveBg}
                className="flex-1 rounded-md bg-accent-500 hover:bg-accent-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 transition"
              >
                Remove Background
              </button>
            </div>
          </div>
        )}

        {/* Processing spinner */}
        {mode === "processing" && (
          <div className="rounded-xl border border-ink-600 bg-ink-800 p-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-ink-200">Removing background…</p>
            <p className="text-xs text-ink-100">This may take a moment on first run.</p>
          </div>
        )}

        {/* Error */}
        {mode === "error" && (
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-red-400 text-center">{errorMsg}</p>
            <button type="button" onClick={handleRedraw} className="rounded-md bg-ink-600 text-ink-100 text-xs py-2 px-4 hover:bg-ink-500 transition">
              Try Again
            </button>
          </div>
        )}

        {/* Done — isolated subject preview */}
        {mode === "done" && isolatedBlobUrl && (
          <div className="rounded-xl border border-ink-600 bg-ink-800 p-4 flex flex-col items-center gap-4">
            <div
              className="w-full rounded overflow-hidden flex items-center justify-center"
              style={{
                background: "repeating-conic-gradient(#2a2a35 0% 25%, #1a1a22 0% 50%) 0 0 / 16px 16px",
                minHeight: "120px", maxHeight: "360px",
              }}
            >
              <img src={isolatedBlobUrl} alt="Isolated subject" className="max-h-80 max-w-full object-contain" />
            </div>
            <p className="text-xs text-ink-200 text-center">Background removed successfully.</p>
            <div className="flex gap-2 w-full">
              <button type="button" onClick={handleRedraw} className="flex-1 rounded-md bg-ink-600 text-ink-100 text-xs py-2 hover:bg-ink-500 transition">
                Redraw Selection
              </button>
              <button
                type="button"
                onClick={() => isolatedPath && onContinue(isolatedPath)}
                className="flex-1 rounded-md bg-accent-500 hover:bg-accent-400 text-white text-xs font-semibold py-2 transition"
              >
                {ctaLabel}
              </button>
            </div>
          </div>
        )}

        <button type="button" onClick={onBack} className="mt-5 w-full text-xs text-ink-200 hover:text-ink-100 transition">
          {backLabel}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Collapsible section with badge
// ============================================================

function CollapsibleStack({
  title, layerCount, open, onToggle, children,
}: {
  title: string; layerCount: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-ink-600 overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-ink-700/60 hover:bg-ink-700 transition">
        <span className="flex-1 text-xs font-semibold text-ink-100">{title}</span>
        {layerCount > 0 && (
          <span className="text-[10px] font-bold bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-full px-1.5 py-px leading-none">
            {layerCount}
          </span>
        )}
        <ChevronIcon open={open} />
      </button>
      {open && <div className="p-3 border-t border-ink-600 bg-ink-800">{children}</div>}
    </div>
  );
}

function StackTabs({ tab, onTabChange }: { tab: "layers" | "curves"; onTabChange: (t: "layers" | "curves") => void }) {
  return (
    <div className="flex bg-ink-700 rounded-md p-0.5 mb-3 gap-0.5">
      {(["layers", "curves"] as const).map((t) => (
        <button key={t} type="button" onClick={() => onTabChange(t)}
          className={["flex-1 text-xs py-1 rounded transition capitalize", tab === t ? "bg-ink-500 text-white font-medium" : "text-ink-200 hover:text-white"].join(" ")}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}

function AddLayerButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" disabled={count >= 5} onClick={onClick}
      className="w-full mt-2 rounded-md border border-dashed border-ink-500 text-xs text-ink-200 py-2 hover:border-ink-400 hover:text-ink-100 disabled:opacity-40 disabled:cursor-not-allowed transition">
      + Add Layer{count >= 5 ? " (max 5)" : ""}
    </button>
  );
}

// ============================================================
// Layer Stack
// ============================================================

function isMaskActive(mask: LayerMask): boolean {
  return mask.luminosity.enabled || (mask.colorRange.enabled && mask.colorRange.activeChannels.length > 0);
}

function LayerStack({
  layers, activeLayerId, onSelect, onRemove, onToggleVisible, onSetIntensity, onSetMask, onReorder, dragSrcIdx,
}: {
  layers: FilterLayer[]; activeLayerId: string;
  onSelect: (id: string) => void; onRemove: (id: string) => void;
  onToggleVisible: (id: string) => void; onSetIntensity: (id: string, v: number) => void;
  onSetMask: (id: string, mask: LayerMask) => void;
  onReorder: (from: number, to: number) => void;
  dragSrcIdx: React.MutableRefObject<number | null>;
}) {
  if (!layers.length) return <p className="text-xs text-ink-200 mb-2">No layers — add one below.</p>;
  return (
    <div className="space-y-2 mb-2">
      {layers.map((layer, index) => (
        <LayerCard
          key={layer.id} layer={layer} index={index} isActive={layer.id === activeLayerId}
          onSelect={() => onSelect(layer.id)} onRemove={() => onRemove(layer.id)}
          onToggleVisible={() => onToggleVisible(layer.id)}
          onSetIntensity={(v) => onSetIntensity(layer.id, v)}
          onSetMask={(mask) => onSetMask(layer.id, mask)}
          dragSrcIdx={dragSrcIdx} onReorder={onReorder}
        />
      ))}
    </div>
  );
}

function LayerCard({
  layer, index, isActive, onSelect, onRemove, onToggleVisible, onSetIntensity, onSetMask, dragSrcIdx, onReorder,
}: {
  layer: FilterLayer; index: number; isActive: boolean;
  onSelect: () => void; onRemove: () => void; onToggleVisible: () => void;
  onSetIntensity: (v: number) => void; onSetMask: (mask: LayerMask) => void;
  dragSrcIdx: React.MutableRefObject<number | null>; onReorder: (from: number, to: number) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [maskOpen, setMaskOpen]     = useState(false);
  const preset = PRESETS_BY_ID[layer.preset];

  return (
    <div
      className={["rounded-md border p-2 cursor-pointer transition-colors select-none",
        isActive ? "border-accent-500 bg-ink-700" : "border-ink-600 bg-ink-700/60 hover:border-ink-400",
        isDragOver ? "border-accent-500/60 ring-1 ring-accent-500/30" : "",
        !layer.visible ? "opacity-50" : "",
      ].filter(Boolean).join(" ")}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragEnter={() => setIsDragOver(true)}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setIsDragOver(false);
        if (dragSrcIdx.current === null || dragSrcIdx.current === index) return;
        onReorder(dragSrcIdx.current, index); dragSrcIdx.current = null;
      }}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <span draggable onDragStart={() => { dragSrcIdx.current = index; }} onDragEnd={() => { dragSrcIdx.current = null; setIsDragOver(false); }}>
          <GripIcon />
        </span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          className={["shrink-0 transition-colors", layer.visible ? "text-ink-200 hover:text-ink-100" : "text-ink-200 hover:text-ink-200"].join(" ")}>
          <EyeIcon open={layer.visible} />
        </button>
        <span className="flex-1 text-xs text-ink-100 truncate min-w-0 mr-auto">{preset.name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {preset.pro && <span className="rounded-sm bg-accent-500 text-ink-900 text-[9px] font-bold tracking-wider px-1 py-px leading-none">Premium</span>}
          <button type="button" onClick={(e) => { e.stopPropagation(); setMaskOpen((v) => !v); }}
            className={["text-[9px] font-medium px-1.5 py-0.5 rounded border transition-colors",
              maskOpen || isMaskActive(layer.mask) ? "border-accent-500 text-accent-400 bg-accent-500/10" : "border-ink-400 text-ink-200 hover:text-white hover:border-ink-300"].join(" ")}>
            MASK
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-ink-200 hover:text-red-400 transition-colors">
            <TrashIcon />
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-ink-200 shrink-0 w-12">Intensity</span>
        <input type="range" min={0} max={100} step={1} value={layer.intensity}
          onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onSetIntensity(Number(e.target.value))}
          className="flex-1 min-w-0 layer-intensity-slider" />
        <span className="text-[10px] text-ink-200 tabular-nums w-6 text-right shrink-0">{layer.intensity}</span>
      </div>
      {maskOpen && <MaskPanel mask={layer.mask} onUpdate={onSetMask} />}
    </div>
  );
}

// ============================================================
// Mask Panel
// ============================================================

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={["relative shrink-0 w-7 h-4 rounded-full transition-colors", checked ? "bg-accent-500" : "bg-ink-600"].join(" ")}>
      <span className={["absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform", checked ? "translate-x-3.5" : "translate-x-0.5"].join(" ")} />
    </button>
  );
}

function DualRangeSlider({ min, max, low, high, onChangeLow, onChangeHigh }: {
  min: number; max: number; low: number; high: number;
  onChangeLow: (v: number) => void; onChangeHigh: (v: number) => void;
}) {
  return (
    <div className="relative h-5">
      <input type="range" min={min} max={max} step={1} value={low}
        onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onChangeLow(Math.min(Number(e.target.value), high - 1))}
        className="absolute w-full pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        style={{ zIndex: 2 }} />
      <input type="range" min={min} max={max} step={1} value={high}
        onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onChangeHigh(Math.max(Number(e.target.value), low + 1))}
        className="absolute w-full pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        style={{ zIndex: 3 }} />
    </div>
  );
}

function MaskPanel({ mask, onUpdate }: { mask: LayerMask; onUpdate: (mask: LayerMask) => void }) {
  const [lumOpen, setLumOpen]     = useState(mask.luminosity.enabled);
  const [colorOpen, setColorOpen] = useState(mask.colorRange.enabled);

  const setLum   = (patch: Partial<LayerMask["luminosity"]>) => onUpdate({ ...mask, luminosity: { ...mask.luminosity, ...patch } });
  const setColor = (patch: Partial<LayerMask["colorRange"]>) => onUpdate({ ...mask, colorRange: { ...mask.colorRange, ...patch } });
  const setChannelSetting = (patch: Partial<MaskChannelSettings>) => {
    const ch = mask.colorRange.focusedChannel;
    if (!ch) return;
    const existing = mask.colorRange.channels ?? defaultChannels();
    onUpdate({ ...mask, colorRange: { ...mask.colorRange, channels: { ...existing, [ch]: { ...existing[ch], ...patch } } } });
  };

  const cr = mask.colorRange;
  const activeChannels: MaskChannel[] = cr.activeChannels ?? ((cr as any).channel ? [(cr as any).channel as MaskChannel] : []);
  const focusedCh: MaskChannel | null = cr.focusedChannel !== undefined ? cr.focusedChannel : ((cr as any).channel as MaskChannel | null) ?? null;
  const chSettings = focusedCh ? (cr.channels ?? defaultChannels())[focusedCh] : null;

  return (
    <div className="mt-2 pt-2 border-t border-ink-600 space-y-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {/* Luminosity */}
      <div className="rounded border border-ink-600 overflow-hidden">
        <button type="button" onClick={() => setLumOpen((v) => !v)} className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-ink-700/50 transition">
          <span className="flex-1 text-[11px] text-ink-200">Luminosity</span>
          <ToggleSwitch checked={mask.luminosity.enabled} onChange={(enabled) => { setLum({ enabled }); if (enabled) setLumOpen(true); }} />
          <ChevronIcon open={lumOpen} />
        </button>
        {lumOpen && (
          <div className={["px-2 pb-2 pt-1 space-y-2 border-t border-ink-600 bg-ink-700/20", !mask.luminosity.enabled ? "opacity-40 pointer-events-none" : ""].join(" ")}>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-ink-200">Range</span>
                <span className="text-[10px] text-ink-200 tabular-nums">{mask.luminosity.min}–{mask.luminosity.max}</span>
              </div>
              <DualRangeSlider min={0} max={255} low={mask.luminosity.min} high={mask.luminosity.max} onChangeLow={(min) => setLum({ min })} onChangeHigh={(max) => setLum({ max })} />
            </div>
            <label className="block">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-ink-200">Smoothness</span>
                <span className="text-[10px] text-ink-200 tabular-nums">{mask.luminosity.smoothness}</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={mask.luminosity.smoothness} onChange={(e) => setLum({ smoothness: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[10px] text-ink-200">Invert</span>
              <input type="checkbox" checked={mask.luminosity.invert} onChange={(e) => setLum({ invert: e.target.checked })} className="h-3.5 w-3.5 rounded border-ink-500 bg-ink-700 text-accent-500 focus:ring-accent-500" />
            </label>
          </div>
        )}
      </div>

      {/* Color Range */}
      <div className="rounded border border-ink-600 overflow-hidden">
        <button type="button" onClick={() => setColorOpen((v) => !v)} className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-ink-700/50 transition">
          <span className="flex-1 text-[11px] text-ink-200">Color Range</span>
          <ToggleSwitch checked={mask.colorRange.enabled} onChange={(enabled) => { setColor({ enabled }); if (enabled) setColorOpen(true); }} />
          <ChevronIcon open={colorOpen} />
        </button>
        {colorOpen && (
          <div className={["px-2 pb-2 pt-1 space-y-2 border-t border-ink-600 bg-ink-700/20", !mask.colorRange.enabled ? "opacity-40 pointer-events-none" : ""].join(" ")}>
            <div>
              <span className="text-[10px] text-ink-200 block mb-1.5">Channels</span>
              <div className="flex flex-wrap gap-1">
                {MASK_CHANNEL_DEFS.map(({ key, label, color }) => {
                  const isActive = activeChannels.includes(key);
                  return (
                    <div key={key} className="relative">
                      <button type="button"
                        onClick={() => isActive ? setColor({ focusedChannel: key }) : setColor({ activeChannels: [...activeChannels, key], focusedChannel: key })}
                        className={["text-[10px] w-6 h-6 rounded-full border transition font-medium", isActive ? "border-current" : "border-ink-600 text-ink-200 hover:border-ink-400"].join(" ")}
                        style={isActive ? { color, borderColor: color } : undefined}>
                        {label}
                      </button>
                      {isActive && (
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); const na = activeChannels.filter((k) => k !== key); setColor({ activeChannels: na, focusedChannel: focusedCh === key ? (na[0] ?? null) : focusedCh }); }}
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ink-500 hover:bg-ink-400 text-ink-100 flex items-center justify-center text-[8px]">×</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {chSettings === null ? (
              <p className="text-[10px] text-ink-100 text-center py-1">Select a channel to adjust its settings.</p>
            ) : (
              <>
                <p className="text-[10px] font-medium text-ink-200">{focusedCh!.charAt(0).toUpperCase() + focusedCh!.slice(1)}</p>
                <label className="block">
                  <div className="flex items-baseline justify-between mb-1"><span className="text-[10px] text-ink-200">Expansion</span><span className="text-[10px] text-ink-200 tabular-nums">{chSettings.expansion}</span></div>
                  <input type="range" min={0} max={100} step={1} value={chSettings.expansion} onChange={(e) => setChannelSetting({ expansion: Number(e.target.value) })} className="w-full" />
                </label>
                <label className="block">
                  <div className="flex items-baseline justify-between mb-1"><span className="text-[10px] text-ink-200">Smoothness</span><span className="text-[10px] text-ink-200 tabular-nums">{chSettings.smoothness}</span></div>
                  <input type="range" min={0} max={100} step={1} value={chSettings.smoothness} onChange={(e) => setChannelSetting({ smoothness: Number(e.target.value) })} className="w-full" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-ink-200">Invert</span>
                  <input type="checkbox" checked={chSettings.invert} onChange={(e) => setChannelSetting({ invert: e.target.checked })} className="h-3.5 w-3.5 rounded border-ink-500 bg-ink-700 text-accent-500 focus:ring-accent-500" />
                </label>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Fine Tuning Panel
// ============================================================

function FineTuningPanel({ preset, params, setParams }: { preset: PresetDef; params: Params; setParams: (p: Params) => void }) {
  const setParam    = (key: string, value: string | number | boolean) => setParams({ ...params, [key]: value });
  const standard    = useMemo(() => preset.controls.filter((c) => !c.pro), [preset]);
  const proControls = useMemo(() => preset.controls.filter((c) =>  c.pro), [preset]);
  return (
    <div className="space-y-4">
      {standard.map((c) => <ControlInput key={c.key} control={c} value={params[c.key]} onChange={(v) => setParam(c.key, v)} />)}
      {proControls.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2 border-t border-ink-600">
            <span className="text-[10px] uppercase tracking-wider text-accent-400 font-semibold">Premium Enhancements</span>
            <span className="flex-1 h-px bg-ink-600" />
          </div>
          {proControls.map((c) => <ControlInput key={c.key} control={c} value={params[c.key]} onChange={(v) => setParam(c.key, v)} />)}
        </>
      )}
    </div>
  );
}

// ============================================================
// Curves Panel
// ============================================================

function drawCurveCanvas(canvas: HTMLCanvasElement, points: CurvePoint[], color: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const SZ = 256;
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0, 0, SZ, SZ);
  ctx.strokeStyle = "#333333"; ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const v = (i / 4) * SZ;
    ctx.beginPath(); ctx.moveTo(v, 0);  ctx.lineTo(v, SZ); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, v);  ctx.lineTo(SZ, v); ctx.stroke();
  }
  ctx.setLineDash([3, 3]); ctx.strokeStyle = "#444444"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, SZ); ctx.lineTo(SZ, 0); ctx.stroke();
  ctx.setLineDash([]);
  if (points.length < 2) return;
  const sorted = points.slice().sort((a, b) => a[0] - b[0]);
  const n = sorted.length;
  const xs = sorted.map((p) => p[0]);
  const ys = sorted.map((p) => p[1]);
  const delta: number[] = [];
  for (let k = 0; k < n - 1; k++) { const dx = xs[k+1]-xs[k]; delta.push(dx < 1e-10 ? 0 : (ys[k+1]-ys[k])/dx); }
  const m: number[] = new Array(n);
  m[0] = delta[0]; m[n-1] = delta[n-2];
  for (let k = 1; k < n-1; k++) m[k] = (delta[k-1]+delta[k])/2;
  for (let k = 0; k < n-1; k++) {
    if (Math.abs(delta[k]) < 1e-10) { m[k]=0; m[k+1]=0; }
    else { const a=m[k]/delta[k], b=m[k+1]/delta[k], s=a*a+b*b; if(s>9){const t=3/Math.sqrt(s); m[k]=t*a*delta[k]; m[k+1]=t*b*delta[k];} }
  }
  const cy = (v: number) => SZ - 1 - v;
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xs[0], cy(ys[0]));
  for (let k = 0; k < n-1; k++) { const h=xs[k+1]-xs[k]; if(h<1e-10)continue; ctx.bezierCurveTo(xs[k]+h/3,cy(ys[k]+m[k]*h/3),xs[k+1]-h/3,cy(ys[k+1]-m[k+1]*h/3),xs[k+1],cy(ys[k+1])); }
  ctx.stroke();
  for (const [ix, iy] of sorted) { ctx.beginPath(); ctx.arc(ix,cy(iy),4,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); ctx.lineWidth=1.5; ctx.strokeStyle="#111"; ctx.stroke(); }
}

function CurvesPanel({ curves, onUpdate }: { curves: LayerCurves; onUpdate: (c: LayerCurves) => void }) {
  const [activeCh, setActiveCh] = useState<CurveChannel>("rgb");
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const dragging   = useRef<number | null>(null);
  const latestPts  = useRef<CurvePoint[]>(curves[activeCh]);
  const activePts  = curves[activeCh];
  const chColor    = CURVE_CHANNEL_DEFS.find((d) => d.key === activeCh)!.color;
  latestPts.current = activePts;

  useEffect(() => { const c = canvasRef.current; if (c) drawCurveCanvas(c, activePts, chColor); }, [activePts, chColor]);

  function setCurve(pts: CurvePoint[]) { onUpdate({ ...curves, [activeCh]: pts.slice().sort((a, b) => a[0]-b[0]) }); }
  function toPoint(e: React.MouseEvent<HTMLCanvasElement>): CurvePoint {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return [Math.max(0,Math.min(255,Math.round((e.clientX-r.left)*256/r.width))), Math.max(0,Math.min(255,255-Math.round((e.clientY-r.top)*256/r.height)))];
  }
  function hitTest(pt: CurvePoint): number {
    const pts=latestPts.current; const HIT=14;
    for (let i=pts.length-1;i>=0;i--) { const dx=pt[0]-pts[i][0],dy=pt[1]-pts[i][1]; if(dx*dx+dy*dy<HIT*HIT) return i; }
    return -1;
  }
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button!==0) return; e.preventDefault();
    const pt=toPoint(e); const idx=hitTest(pt);
    if (idx>=0) { dragging.current=idx; return; }
    const pts=latestPts.current; if(pts.length>=10) return;
    const next=[...pts,pt]; const sorted=next.slice().sort((a,b)=>a[0]-b[0]);
    dragging.current=sorted.indexOf(pt); onUpdate({...curves,[activeCh]:sorted});
  }
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (dragging.current===null) return; e.preventDefault();
    const idx=dragging.current; const pts=latestPts.current; if(idx>=pts.length) return;
    const [nx,ny]=toPoint(e); const orig=pts[idx]; const isEndpt=orig[0]===0||orig[0]===255;
    const clampedX=isEndpt?orig[0]:Math.max(idx>0?pts[idx-1][0]+1:1,Math.min(idx<pts.length-1?pts[idx+1][0]-1:254,nx));
    onUpdate({...curves,[activeCh]:pts.map<CurvePoint>((p,i)=>(i===idx?[clampedX,ny]:p))});
  }
  function handleMouseUp() { dragging.current=null; }
  function handleRemove(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault(); const pt=toPoint(e); const idx=hitTest(pt); if(idx<0) return;
    const pts=latestPts.current; const p=pts[idx]; if(p[0]===0||p[0]===255) return;
    setCurve(pts.filter((_,i)=>i!==idx));
  }

  return (
    <section className="mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          {CURVE_CHANNEL_DEFS.map(({ key, label, color }) => (
            <button key={key} type="button" onClick={() => setActiveCh(key)}
              className={["text-[10px] font-medium px-2 py-0.5 rounded border transition", activeCh===key?"border-current":"border-[#4a4a57] text-[#9CA3AF] hover:text-white hover:border-[#6a6a78]"].join(" ")}
              style={activeCh===key?{color,borderColor:color}:undefined}>{label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setCurve([[0,0],[255,255]])} className="text-[11px] text-[#9CA3AF] hover:text-white transition">Reset</button>
          <button type="button" onClick={() => onUpdate(defaultLayerCurves())} className="text-[11px] text-[#9CA3AF] hover:text-white transition">All</button>
        </div>
      </div>
      <div className="w-full aspect-square rounded overflow-hidden border border-ink-600">
        <canvas ref={canvasRef} width={256} height={256} className="w-full h-full block cursor-crosshair"
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} onContextMenu={handleRemove} onDoubleClick={handleRemove} />
      </div>
      <p className="text-[10px] text-[#6B7280] mt-1 leading-snug">Click · Drag · Right-click to remove</p>
    </section>
  );
}

// ============================================================
// Preset Modal
// ============================================================

function PresetModal({ onClose, onSelect }: { onClose: () => void; onSelect: (id: PresetId) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-ink-800 border border-ink-600 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-100">Add Filter Layer</h2>
          <button type="button" onClick={onClose} className="text-ink-200 hover:text-ink-100 text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => onSelect(p.id)} className="relative text-left rounded-md border border-ink-600 bg-ink-700/60 hover:border-accent-500 px-3 py-2 transition">
              {p.pro && <span className="absolute top-1.5 right-1.5 rounded-sm bg-accent-500 text-ink-900 text-[9px] font-bold tracking-wider px-1 py-px leading-none">Premium</span>}
              <div className="text-sm text-ink-100 pr-7">{p.name}</div>
              <div className="text-[11px] text-ink-200 mt-0.5 leading-snug">{p.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Control Input
// ============================================================

function ControlInput({ control, value, onChange }: { control: Control; value: unknown; onChange: (v: string | number | boolean) => void }) {
  if (control.kind === "slider") {
    const v = typeof value === "number" ? value : control.default;
    return (
      <label className="block">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-ink-200">{control.label}</span>
          <span className="text-[11px] text-ink-200 tabular-nums">{v}</span>
        </div>
        <input type="range" min={control.min} max={control.max} step={control.step ?? 1} value={v} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      </label>
    );
  }
  if (control.kind === "select") {
    const v = typeof value === "string" ? value : control.default;
    return (
      <label className="block">
        <span className="text-xs text-ink-200 block mb-1">{control.label}</span>
        <select value={v} onChange={(e) => onChange(e.target.value)} className="w-full bg-ink-700 border border-ink-600 rounded-md text-sm text-ink-100 px-2 py-1.5 focus:outline-none focus:border-accent-500">
          {control.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  if (control.kind === "toggle") {
    const v = typeof value === "boolean" ? value : control.default;
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-200">{control.label}</span>
        <div role="checkbox" aria-checked={v} tabIndex={0}
          onClick={() => onChange(!v)}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!v); } }}
          className={["w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0", v ? "bg-accent-500/20 border-accent-500" : "bg-ink-800 border-ink-300"].join(" ")}>
          {v && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#E85D26" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </div>
    );
  }
  const v = typeof value === "string" ? value : (control as any).default;
  return (
    <label className="flex items-center justify-between">
      <span className="text-xs text-ink-200">{control.label}</span>
      <input type="color" value={v} onChange={(e) => onChange(e.target.value)} className="h-7 w-12 rounded border border-ink-600 bg-transparent cursor-pointer" />
    </label>
  );
}

// ============================================================
// Icons
// ============================================================

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" className="text-ink-200 cursor-grab shrink-0" aria-hidden="true">
      <circle cx="3" cy="2.5" r="1.5"/><circle cx="7" cy="2.5" r="1.5"/>
      <circle cx="3" cy="7"   r="1.5"/><circle cx="7" cy="7"   r="1.5"/>
      <circle cx="3" cy="11.5" r="1.5"/><circle cx="7" cy="11.5" r="1.5"/>
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="text-ink-200 shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
