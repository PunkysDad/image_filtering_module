"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Control,
  PRESETS,
  PRESETS_BY_ID,
  PresetDef,
  PresetId,
  defaultParams,
} from "@/lib/filters";

type Params = Record<string, string | number | boolean>;

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), ms);
    return () => clearTimeout(h);
  }, [value, ms]);
  return v;
}

export default function Dashboard() {
  const [basePath, setBasePath] = useState<string | null>(null);
  const [overlayPath, setOverlayPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingBase, setUploadingBase] = useState(false);
  const [uploadingOverlay, setUploadingOverlay] = useState(false);

  const [basePresetId, setBasePresetId] = useState<PresetId>("film-grain");
  const [baseParams, setBaseParams] = useState<Params>(
    () => defaultParams(PRESETS_BY_ID["film-grain"]) as Params,
  );
  const [overlayPresetId, setOverlayPresetId] = useState<PresetId>("film-grain");
  const [overlayParams, setOverlayParams] = useState<Params>(
    () => defaultParams(PRESETS_BY_ID["film-grain"]) as Params,
  );

  const [knockoutText, setKnockoutText] = useState("");
  const [textSize, setTextSize] = useState(15);
  const [fontWeight, setFontWeight] = useState<400 | 700 | 900>(900);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textPosX, setTextPosX] = useState(50);
  const [textPosY, setTextPosY] = useState(50);

  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const debouncedText = useDebouncedValue(knockoutText, 300);

  // Listen for iframe render-completion messages.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "ready") setIframeReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (iframe.contentDocument?.readyState === "complete") {
      setIframeReady(true);
    }
  }, []);

  // Debounced render dispatch.
  const renderTimer = useRef<number | null>(null);
  const postRender = useCallback(() => {
    if (!iframeRef.current || !basePath) return;
    iframeRef.current.contentWindow?.postMessage(
      {
        type: "render",
        imageUrl: basePath,
        preset: basePresetId,
        params: baseParams,
        seed: 1,
        overlayImageUrl: overlayPath,
        overlayPreset: overlayPath ? overlayPresetId : null,
        overlayParams: overlayPath ? overlayParams : null,
        knockoutText: overlayPath ? debouncedText : null,
        textSize,
        textPosition: { x: textPosX, y: textPosY },
        letterSpacing,
        fontWeight,
      },
      "*",
    );
  }, [
    basePath,
    basePresetId,
    baseParams,
    overlayPath,
    overlayPresetId,
    overlayParams,
    debouncedText,
    textSize,
    textPosX,
    textPosY,
    letterSpacing,
    fontWeight,
  ]);

  useEffect(() => {
    if (!iframeReady || !basePath) return;
    if (renderTimer.current) window.clearTimeout(renderTimer.current);
    renderTimer.current = window.setTimeout(postRender, 60);
    return () => {
      if (renderTimer.current) window.clearTimeout(renderTimer.current);
    };
  }, [iframeReady, basePath, postRender]);

  const onUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    which: "base" | "overlay",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (which === "base") setUploadingBase(true);
    else setUploadingOverlay(true);
    setDownloadUrl(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(j.error || `Upload failed: ${res.status}`);
      }
      const json = (await res.json()) as { imagePath: string };
      if (which === "base") setBasePath(json.imagePath);
      else setOverlayPath(json.imagePath);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      if (which === "base") setUploadingBase(false);
      else setUploadingOverlay(false);
    }
  };

  const removeOverlay = () => {
    setOverlayPath(null);
    setKnockoutText("");
    setDownloadUrl(null);
  };

  const onExport = async () => {
    if (!basePath) return;
    setExporting(true);
    setDownloadUrl(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath: basePath,
          preset: basePresetId,
          params: baseParams,
          seed: 1,
          overlayImagePath: overlayPath,
          overlayPreset: overlayPath ? overlayPresetId : null,
          overlayParams: overlayPath ? overlayParams : null,
          knockoutText: overlayPath ? debouncedText : null,
          textSize,
          textPosition: { x: textPosX, y: textPosY },
          letterSpacing,
          fontWeight,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(j.error || `Export failed: ${res.status}`);
      }
      const json = (await res.json()) as { downloadUrl: string };
      setDownloadUrl(json.downloadUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const showOverlaySection = !!overlayPath;

  return (
    <main className="min-h-screen grid grid-cols-[380px_1fr] gap-0">
      {/* LEFT PANEL */}
      <aside className="bg-ink-800 border-r border-ink-600 p-6 overflow-y-auto max-h-screen">
        <header className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight text-ink-100">
            Image Filter Platform
          </h1>
          <p className="text-xs text-ink-300 mt-1">POC dashboard</p>
        </header>

        <LayerHeader>Base Image</LayerHeader>

        <Section title="Source">
          <label className="block">
            <span className="sr-only">Upload base image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onUpload(e, "base")}
              className="block w-full text-xs text-ink-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-ink-600 file:text-ink-100 file:text-xs hover:file:bg-ink-500 cursor-pointer"
            />
          </label>
          {uploadingBase && (
            <p className="text-xs text-ink-300 mt-2">Uploading…</p>
          )}
          {basePath && !uploadingBase && (
            <p className="text-xs text-ink-300 mt-2 truncate">
              Loaded: {basePath.split("/").pop()}
            </p>
          )}
        </Section>

        <FilterPanel
          presetId={basePresetId}
          onPresetChange={(id) => {
            setBasePresetId(id);
            setBaseParams(defaultParams(PRESETS_BY_ID[id]) as Params);
            setDownloadUrl(null);
          }}
          params={baseParams}
          setParams={setBaseParams}
        />

        <LayerHeader>Overlay Image</LayerHeader>

        <Section title="Source">
          <label className="block">
            <span className="sr-only">Upload overlay image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onUpload(e, "overlay")}
              className="block w-full text-xs text-ink-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-ink-600 file:text-ink-100 file:text-xs hover:file:bg-ink-500 cursor-pointer"
            />
          </label>
          {uploadingOverlay && (
            <p className="text-xs text-ink-300 mt-2">Uploading…</p>
          )}
          {overlayPath && !uploadingOverlay && (
            <div className="flex items-center justify-between mt-2 gap-2">
              <p className="text-xs text-ink-300 truncate">
                Loaded: {overlayPath.split("/").pop()}
              </p>
              <button
                type="button"
                onClick={removeOverlay}
                className="text-[11px] text-ink-300 hover:text-ink-100"
              >
                Remove
              </button>
            </div>
          )}
        </Section>

        {showOverlaySection && (
          <>
            <FilterPanel
              presetId={overlayPresetId}
              onPresetChange={(id) => {
                setOverlayPresetId(id);
                setOverlayParams(defaultParams(PRESETS_BY_ID[id]) as Params);
                setDownloadUrl(null);
              }}
              params={overlayParams}
              setParams={setOverlayParams}
            />

            <Section title="Knockout Text">
              <input
                type="text"
                placeholder="Enter text..."
                value={knockoutText}
                onChange={(e) => setKnockoutText(e.target.value)}
                className="w-full bg-ink-700 border border-ink-600 rounded-md text-sm text-ink-100 px-2 py-1.5 focus:outline-none focus:border-accent-500 mb-4"
              />
              <div className="space-y-4">
                <Slider
                  label="Font Size"
                  min={5}
                  max={30}
                  value={textSize}
                  onChange={setTextSize}
                />
                <label className="block">
                  <span className="text-xs text-ink-200 block mb-1">
                    Font Weight
                  </span>
                  <select
                    value={String(fontWeight)}
                    onChange={(e) =>
                      setFontWeight(Number(e.target.value) as 400 | 700 | 900)
                    }
                    className="w-full bg-ink-700 border border-ink-600 rounded-md text-sm text-ink-100 px-2 py-1.5 focus:outline-none focus:border-accent-500"
                  >
                    <option value="400">Regular</option>
                    <option value="700">Bold</option>
                    <option value="900">Black</option>
                  </select>
                </label>
                <Slider
                  label="Letter Spacing"
                  min={0}
                  max={20}
                  value={letterSpacing}
                  onChange={setLetterSpacing}
                />
                <Slider
                  label="Horizontal Position"
                  min={0}
                  max={100}
                  value={textPosX}
                  onChange={setTextPosX}
                />
                <Slider
                  label="Vertical Position"
                  min={0}
                  max={100}
                  value={textPosY}
                  onChange={setTextPosY}
                />
              </div>
            </Section>
          </>
        )}

        <Section title="Export">
          <button
            type="button"
            disabled={!basePath || exporting}
            onClick={onExport}
            className="w-full rounded-md bg-accent-500 hover:bg-accent-400 disabled:bg-ink-600 disabled:text-ink-300 text-ink-900 font-medium text-sm py-2.5 transition"
          >
            {exporting ? "Rendering export…" : "Export as WebP"}
          </button>
          {uploadError && (
            <p className="text-xs text-red-400 mt-2">{uploadError}</p>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="block mt-3 text-xs text-accent-400 underline break-all"
            >
              Download: {downloadUrl}
            </a>
          )}
        </Section>
      </aside>

      {/* RIGHT PANEL */}
      <section className="bg-ink-900 flex flex-col">
        <div className="border-b border-ink-600 px-6 py-3 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-ink-300">
            Preview
          </span>
          <span className="text-[11px] text-ink-400">
            {basePath ? "Live" : "Upload an image to begin"}
          </span>
        </div>
        <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_#1a1a20_0%,_#0b0b0d_70%)]">
          <iframe
            ref={iframeRef}
            src="/render.html"
            title="Filter preview"
            onLoad={() => setIframeReady(true)}
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      </section>
    </main>
  );
}

function LayerHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.15em] text-accent-400 font-bold mb-3 mt-2 pb-1 border-b border-accent-500/30">
      {children}
    </div>
  );
}

function FilterPanel({
  presetId,
  onPresetChange,
  params,
  setParams,
}: {
  presetId: PresetId;
  onPresetChange: (id: PresetId) => void;
  params: Params;
  setParams: React.Dispatch<React.SetStateAction<Params>>;
}) {
  const preset: PresetDef = PRESETS_BY_ID[presetId];
  const setParam = (key: string, value: string | number | boolean) =>
    setParams((p) => ({ ...p, [key]: value }));
  const standard = useMemo(
    () => preset.controls.filter((c) => !c.pro),
    [preset],
  );
  const proControls = useMemo(
    () => preset.controls.filter((c) => c.pro),
    [preset],
  );
  return (
    <>
      <Section title="Preset">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={[
                "relative text-left rounded-md border px-3 py-2 transition",
                p.id === presetId
                  ? "border-accent-500 bg-ink-700"
                  : "border-ink-600 bg-ink-700/60 hover:border-ink-400",
              ].join(" ")}
            >
              {p.pro && (
                <span className="absolute top-1.5 right-1.5 rounded-sm bg-accent-500 text-ink-900 text-[9px] font-bold tracking-wider px-1 py-px leading-none">
                  PRO
                </span>
              )}
              <div className="text-sm text-ink-100 pr-7">{p.name}</div>
              <div className="text-[11px] text-ink-300 mt-0.5 leading-snug">
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Fine Tuning">
        <div className="space-y-4">
          {standard.map((c) => (
            <ControlInput
              key={c.key}
              control={c}
              value={params[c.key]}
              onChange={(v) => setParam(c.key, v)}
            />
          ))}
          {proControls.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2 border-t border-ink-600">
                <span className="text-[10px] uppercase tracking-wider text-accent-400 font-semibold">
                  Pro Enhancements
                </span>
                <span className="flex-1 h-px bg-ink-600" />
              </div>
              {proControls.map((c) => (
                <ControlInput
                  key={c.key}
                  control={c}
                  value={params[c.key]}
                  onChange={(v) => setParam(c.key, v)}
                />
              ))}
            </>
          )}
        </div>
      </Section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-[11px] uppercase tracking-wider text-ink-300 mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-ink-200">{label}</span>
        <span className="text-[11px] text-ink-400 tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function ControlInput({
  control,
  value,
  onChange,
}: {
  control: Control;
  value: unknown;
  onChange: (v: string | number | boolean) => void;
}) {
  if (control.kind === "slider") {
    const v = typeof value === "number" ? value : control.default;
    return (
      <label className="block">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-ink-200">{control.label}</span>
          <span className="text-[11px] text-ink-400 tabular-nums">{v}</span>
        </div>
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step ?? 1}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
      </label>
    );
  }
  if (control.kind === "select") {
    const v = typeof value === "string" ? value : control.default;
    return (
      <label className="block">
        <span className="text-xs text-ink-200 block mb-1">{control.label}</span>
        <select
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-ink-700 border border-ink-600 rounded-md text-sm text-ink-100 px-2 py-1.5 focus:outline-none focus:border-accent-500"
        >
          {control.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (control.kind === "toggle") {
    const v = typeof value === "boolean" ? value : control.default;
    return (
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs text-ink-200">{control.label}</span>
        <input
          type="checkbox"
          checked={v}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-ink-500 bg-ink-700 text-accent-500 focus:ring-accent-500"
        />
      </label>
    );
  }
  // color
  const v = typeof value === "string" ? value : control.default;
  return (
    <label className="flex items-center justify-between">
      <span className="text-xs text-ink-200">{control.label}</span>
      <input
        type="color"
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-12 rounded border border-ink-600 bg-transparent cursor-pointer"
      />
    </label>
  );
}
