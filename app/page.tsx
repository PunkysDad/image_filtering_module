"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Control,
  PRESETS,
  PRESETS_BY_ID,
  PresetDef,
  PresetId,
  defaultParams,
} from "@/lib/filters";

type Params = Record<string, string | number | boolean>;

export default function Dashboard() {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [presetId, setPresetId] = useState<PresetId>("film-grain");
  const [params, setParams] = useState<Params>(() =>
    defaultParams(PRESETS_BY_ID["film-grain"]) as Params,
  );
  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const preset: PresetDef = PRESETS_BY_ID[presetId];

  // Reset params when preset changes.
  useEffect(() => {
    setParams(defaultParams(preset) as Params);
    setDownloadUrl(null);
  }, [presetId, preset]);

  // Listen for iframe render-completion messages. The ready signal is handled
  // by the iframe's onLoad callback (plus a readyState check below) because
  // the iframe can finish loading before React hydrates and attaches listeners
  // — the postMessage "ready" would be lost in that window.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "ready") setIframeReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // If the iframe finished loading before hydration, its onLoad won't fire
  // for us — detect that case here.
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
    if (!iframeRef.current || !imagePath) return;
    iframeRef.current.contentWindow?.postMessage(
      {
        type: "render",
        imageUrl: imagePath,
        preset: presetId,
        params,
        seed: 1, // deterministic fixed seed for POC
      },
      "*",
    );
  }, [imagePath, presetId, params]);

  useEffect(() => {
    if (!iframeReady || !imagePath) return;
    if (renderTimer.current) window.clearTimeout(renderTimer.current);
    renderTimer.current = window.setTimeout(postRender, 60);
    return () => {
      if (renderTimer.current) window.clearTimeout(renderTimer.current);
    };
  }, [iframeReady, imagePath, presetId, params, postRender]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
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
      setImagePath(json.imagePath);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const onExport = async () => {
    if (!imagePath) return;
    setExporting(true);
    setDownloadUrl(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePath,
          preset: presetId,
          params,
          seed: 1,
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

  const setParam = (key: string, value: string | number | boolean) =>
    setParams((p) => ({ ...p, [key]: value }));

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

        <Section title="Source Image">
          <label className="block">
            <span className="sr-only">Upload image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="block w-full text-xs text-ink-200 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-ink-600 file:text-ink-100 file:text-xs hover:file:bg-ink-500 cursor-pointer"
            />
          </label>
          {uploading && (
            <p className="text-xs text-ink-300 mt-2">Uploading…</p>
          )}
          {uploadError && (
            <p className="text-xs text-red-400 mt-2">{uploadError}</p>
          )}
          {imagePath && !uploading && (
            <p className="text-xs text-ink-300 mt-2 truncate">
              Loaded: {imagePath.split("/").pop()}
            </p>
          )}
        </Section>

        <Section title="Preset">
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={[
                  "text-left rounded-md border px-3 py-2 transition",
                  p.id === presetId
                    ? "border-accent-500 bg-ink-700"
                    : "border-ink-600 bg-ink-700/60 hover:border-ink-400",
                ].join(" ")}
              >
                <div className="text-sm text-ink-100">{p.name}</div>
                <div className="text-[11px] text-ink-300 mt-0.5 leading-snug">
                  {p.description}
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Fine Tuning">
          <div className="space-y-4">
            {preset.controls.map((c) => (
              <ControlInput
                key={c.key}
                control={c}
                value={params[c.key]}
                onChange={(v) => setParam(c.key, v)}
              />
            ))}
          </div>
        </Section>

        <Section title="Export">
          <button
            type="button"
            disabled={!imagePath || exporting}
            onClick={onExport}
            className="w-full rounded-md bg-accent-500 hover:bg-accent-400 disabled:bg-ink-600 disabled:text-ink-300 text-ink-900 font-medium text-sm py-2.5 transition"
          >
            {exporting ? "Rendering export…" : "Export as WebP"}
          </button>
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
            {imagePath ? "Live" : "Upload an image to begin"}
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
