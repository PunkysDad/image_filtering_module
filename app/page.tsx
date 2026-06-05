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
  Control,
  PRESETS,
  PRESETS_BY_ID,
  PresetDef,
  PresetId,
  defaultParams,
} from "@/lib/filters";
import AiTutor from "@/components/AiTutor";
import CompositeWorkspace from "@/components/CompositeWorkspace";
import { useAuth } from "@/lib/auth-context";
import AuthModal, { AuthMode, preservePendingLayers } from "@/components/AuthModal";
import TutorialModal from "@/components/TutorialModal";

type Params = Record<string, string | number | boolean>;

export type MaskChannel = "reds" | "oranges" | "yellows" | "greens" | "cyans" | "blues" | "magentas";

export type MaskChannelSettings = {
  expansion: number;  // 0–100
  smoothness: number; // 0–100
  invert: boolean;
};

const DEFAULT_CHANNEL_SETTINGS: MaskChannelSettings = { expansion: 50, smoothness: 50, invert: false };

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

export type LayerMask = {
  luminosity: {
    enabled: boolean;
    min: number;
    max: number;
    smoothness: number;
    invert: boolean;
  };
  colorRange: {
    enabled: boolean;
    activeChannels: MaskChannel[];      // channels participating in the render
    focusedChannel: MaskChannel | null; // UI-only: which channel's sliders are shown
    channels: Record<MaskChannel, MaskChannelSettings>;
  };
};

function defaultMask(): LayerMask {
  return {
    luminosity: { enabled: false, min: 0, max: 255, smoothness: 50, invert: false },
    colorRange:  { enabled: false, activeChannels: [], focusedChannel: null, channels: defaultChannels() },
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

export type CurvePoint = [number, number]; // [input 0–255, output 0–255]
export type Curve = CurvePoint[];
export type CurveChannel = "rgb" | "r" | "g" | "b";

export type LayerCurves = {
  rgb: Curve;
  r:   Curve;
  g:   Curve;
  b:   Curve;
};

function defaultLayerCurves(): LayerCurves {
  return {
    rgb: [[0, 0], [255, 255]],
    r:   [[0, 0], [255, 255]],
    g:   [[0, 0], [255, 255]],
    b:   [[0, 0], [255, 255]],
  };
}

const CURVE_CHANNEL_DEFS: { key: CurveChannel; label: string; color: string }[] = [
  { key: "rgb", label: "RGB", color: "#ffffff" },
  { key: "r",   label: "R",   color: "#ff6b6b" },
  { key: "g",   label: "G",   color: "#6bff8a" },
  { key: "b",   label: "B",   color: "#6b9fff" },
];

export type FilterLayer = {
  id: string;
  preset: PresetId;
  params: Params;
  visible: boolean;
  intensity: number; // 0–100
  mask: LayerMask;
  curves: LayerCurves;
};

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
    case "remove":
      return state.filter((l) => l.id !== action.id);
    case "set-params":
      return state.map((l) =>
        l.id === action.id ? { ...l, params: action.params } : l,
      );
    case "toggle-visible":
      return state.map((l) =>
        l.id === action.id ? { ...l, visible: !l.visible } : l,
      );
    case "set-intensity":
      return state.map((l) =>
        l.id === action.id ? { ...l, intensity: action.intensity } : l,
      );
    case "set-mask":
      return state.map((l) =>
        l.id === action.id ? { ...l, mask: action.mask } : l,
      );
    case "set-curves":
      return state.map((l) =>
        l.id === action.id ? { ...l, curves: action.curves } : l,
      );
    case "reorder": {
      const next = [...state];
      const [moved] = next.splice(action.from, 1);
      next.splice(action.to, 0, moved);
      return next;
    }
    case "restore":
      return action.layers;
    default:
      return state;
  }
}

export type HslChannel = { hue: number; saturation: number; luminance: number };
export type HslState = {
  reds: HslChannel;
  oranges: HslChannel;
  yellows: HslChannel;
  greens: HslChannel;
  cyans: HslChannel;
  blues: HslChannel;
  magentas: HslChannel;
};

const defaultHSL: HslState = {
  reds:     { hue: 0, saturation: 0, luminance: 0 },
  oranges:  { hue: 0, saturation: 0, luminance: 0 },
  yellows:  { hue: 0, saturation: 0, luminance: 0 },
  greens:   { hue: 0, saturation: 0, luminance: 0 },
  cyans:    { hue: 0, saturation: 0, luminance: 0 },
  blues:    { hue: 0, saturation: 0, luminance: 0 },
  magentas: { hue: 0, saturation: 0, luminance: 0 },
};

const HSL_CHANNEL_DEFS = [
  { key: "reds"     as keyof HslState, label: "Reds",     color: "#ff4040" },
  { key: "oranges"  as keyof HslState, label: "Oranges",  color: "#ff9800" },
  { key: "yellows"  as keyof HslState, label: "Yellows",  color: "#ffe500" },
  { key: "greens"   as keyof HslState, label: "Greens",   color: "#44bb44" },
  { key: "cyans"    as keyof HslState, label: "Cyans",    color: "#00ccdd" },
  { key: "blues"    as keyof HslState, label: "Blues",    color: "#4488ff" },
  { key: "magentas" as keyof HslState, label: "Magentas", color: "#ff44cc" },
];

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), ms);
    return () => clearTimeout(h);
  }, [value, ms]);
  return v;
}

// Maps a layer to the payload sent to the renderer. Focal Blur stays inert
// until the user clicks "Apply Blur" (which writes focalRadius onto the layer);
// until then it renders with intensity 0 so simply adding the layer — or
// positioning its box — never auto-applies a blur.
function layerForRender(l: FilterLayer) {
  const focalPending =
    l.preset === "focal-blur" && typeof l.params.focalRadius !== "number";
  return {
    preset: l.preset,
    visible: l.visible,
    intensity: l.intensity,
    params: focalPending ? { ...l.params, intensity: 0 } : l.params,
    mask: l.mask,
    curves: l.curves,
  };
}

// The layer stack is persisted here before the auth flow starts, so it survives
// the page reload that happens after email confirmation. The image itself is
// never persisted — only the layer stack.
const PENDING_LAYERS_KEY = "picmagiq_pending_layers";

function saveLayerStackToStorage(layers: FilterLayer[]) {
  try {
    localStorage.setItem(PENDING_LAYERS_KEY, JSON.stringify(layers));
  } catch {
    // Ignore storage failures (quota exceeded / disabled).
  }
}

export default function Dashboard() {
  // Subscription state comes from AuthContext (Supabase profile.tier).
  const { user, isPremium, profile, isLoading: authLoading, signOut } = useAuth();
  const [mainTab, setMainTab] = useState<"editor" | "composite">("editor");

  // Auth modal, the export waiting on auth to finish, and the top-bar menu.
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [pendingExport, setPendingExport] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Shown when a layer stack persisted before the auth flow is restored.
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  const [basePath, setBasePath] = useState<string | null>(null);
  const [overlayPath, setOverlayPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingBase, setUploadingBase] = useState(false);
  const [uploadingOverlay, setUploadingOverlay] = useState(false);

  const [layers, dispatch] = useReducer(layersReducer, []);
  const [activeLayerId, setActiveLayerId] = useState<string>("");
  const [showPresetModal, setShowPresetModal] = useState(false);

  // Overlay image has its own independent preset (not part of the layer stack)
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

  const [activeTab, setActiveTab] = useState<"layers" | "hsl" | "curves">("layers");
  const [hslAdjustments, setHslAdjustments] = useState<HslState>(() => ({
    reds:     { hue: 0, saturation: 0, luminance: 0 },
    oranges:  { hue: 0, saturation: 0, luminance: 0 },
    yellows:  { hue: 0, saturation: 0, luminance: 0 },
    greens:   { hue: 0, saturation: 0, luminance: 0 },
    cyans:    { hue: 0, saturation: 0, luminance: 0 },
    blues:    { hue: 0, saturation: 0, luminance: 0 },
    magentas: { hue: 0, saturation: 0, luminance: 0 },
  }));

  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportFileName, setExportFileName] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"webp" | "jpeg" | "png">("webp");
  const [exportWidth, setExportWidth] = useState<string>("");
  const [iframeReady, setIframeReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragSrcIdx = useRef<number | null>(null);
  const baseFileRef = useRef<HTMLInputElement>(null);
  const overlayFileRef = useRef<HTMLInputElement>(null);
  const debouncedText = useDebouncedValue(knockoutText, 300);

  const activeLayer =
    layers.find((l) => l.id === activeLayerId) ?? layers[0] ?? null;

  // Focal Blur draws an interactive bounding box over the preview. At most one
  // focal-blur layer can exist (enforced in the Add Layer picker). Keyed off
  // activeLayerId (not the fallback activeLayer) so an explicit deselect
  // (activeLayerId === "") reliably dims the box even when it is layer 0.
  const focalLayer = layers.find((l) => l.preset === "focal-blur") ?? null;
  const focalActive = !!focalLayer && activeLayerId === focalLayer.id;

  // When the active layer is removed, fall back to the last layer. An explicit
  // deselect (activeLayerId === "") is left alone so clicking outside the
  // Focal Blur box can dim it without immediately re-selecting a layer.
  useEffect(() => {
    if (layers.length === 0) {
      setActiveLayerId("");
      return;
    }
    if (activeLayerId !== "" && !layers.find((l) => l.id === activeLayerId)) {
      setActiveLayerId(layers[layers.length - 1].id);
    }
  }, [layers, activeLayerId]);

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
    if (iframe.contentDocument?.readyState === "complete") setIframeReady(true);
  }, []);

  const renderTimer = useRef<number | null>(null);
  const postRender = useCallback(() => {
    if (!iframeRef.current || !basePath) return;
    iframeRef.current.contentWindow?.postMessage(
      {
        type: "render",
        imageUrl: basePath,
        layers: layers.map(layerForRender),
        seed: 1,
        overlayImageUrl: overlayPath,
        overlayPreset: overlayPath ? overlayPresetId : null,
        overlayParams: overlayPath ? overlayParams : null,
        knockoutText: overlayPath ? debouncedText : null,
        textSize,
        textPosition: { x: textPosX, y: textPosY },
        letterSpacing,
        fontWeight,
        hslAdjustments,
      },
      "*",
    );
  }, [
    basePath,
    layers,
    overlayPath,
    overlayPresetId,
    overlayParams,
    debouncedText,
    textSize,
    textPosX,
    textPosY,
    letterSpacing,
    fontWeight,
    hslAdjustments,
  ]);

  useEffect(() => {
    if (!iframeReady || !basePath) return;
    if (renderTimer.current) window.clearTimeout(renderTimer.current);
    renderTimer.current = window.setTimeout(postRender, 300);
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
      if (which === "base") {
        setBasePath(json.imagePath);
        // A fresh image exports at its own original size by default.
        setExportWidth("");
        // A fresh image makes the "settings were saved" banner obsolete.
        setShowRestoreBanner(false);
        try {
          localStorage.removeItem(PENDING_LAYERS_KEY);
        } catch {}
      } else setOverlayPath(json.imagePath);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      if (which === "base") setUploadingBase(false);
      else setUploadingOverlay(false);
    }
  };

  const updateHslChannel = useCallback(
    (channel: keyof HslState, prop: keyof HslChannel, value: number) => {
      setHslAdjustments((prev) => ({
        ...prev,
        [channel]: { ...prev[channel], [prop]: value },
      }));
    },
    [],
  );

  const resetHsl = useCallback(
    () => setHslAdjustments({ ...defaultHSL,
      reds:     { ...defaultHSL.reds },
      oranges:  { ...defaultHSL.oranges },
      yellows:  { ...defaultHSL.yellows },
      greens:   { ...defaultHSL.greens },
      cyans:    { ...defaultHSL.cyans },
      blues:    { ...defaultHSL.blues },
      magentas: { ...defaultHSL.magentas },
    }),
    [],
  );

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
          format: exportFormat,
          exportWidth: exportWidth ? Number(exportWidth) : null,
          layers: layers.map(layerForRender),
          seed: 1,
          overlayImagePath: overlayPath,
          overlayPreset: overlayPath ? overlayPresetId : null,
          overlayParams: overlayPath ? overlayParams : null,
          knockoutText: overlayPath ? debouncedText : null,
          textSize,
          textPosition: { x: textPosX, y: textPosY },
          letterSpacing,
          fontWeight,
          hslAdjustments,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(j.error || `Export failed: ${res.status}`);
      }
      const json = (await res.json()) as { downloadUrl: string };
      setDownloadUrl(json.downloadUrl);
      // Safety: clear any persisted layer stack (covers signing in without a
      // page reload). It is already cleared on restore.
      try {
        localStorage.removeItem(PENDING_LAYERS_KEY);
      } catch {
        // Ignore storage failures.
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const addLayer = (presetId: PresetId) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: "add", preset: presetId, id });
    setActiveLayerId(id);
    setShowPresetModal(false);
  };

  // Whether the current layer stack uses any Pro-tier preset.
  const hasProLayers = layers.some((l) => PRESETS_BY_ID[l.preset]?.pro);

  // ---- Export gate (reads auth state from AuthContext) ----
  const handleExportClick = () => {
    if (!basePath) return;
    if (!user) {
      // Unauthenticated → persist the layer stack so it survives the reload
      // after email confirmation, then prompt account creation and resume.
      saveLayerStackToStorage(layers);
      setPendingExport(true);
      setAuthMode("sign-up-prompt");
      return;
    }
    if (!isPremium && hasProLayers) {
      // Authenticated Basic user with Pro layers → this image cannot be exported.
      setPendingExport(true);
      setAuthMode("export-blocked");
      return;
    }
    onExport(); // Premium, or Basic without Pro layers.
  };

  const handleAuthSuccess = () => {
    // Close the modal; the effect below resumes any pending export once the
    // session/profile have propagated through AuthContext.
    setAuthMode(null);
  };

  const closeAuthModal = () => {
    setAuthMode(null);
    setPendingExport(false);
  };

  // Resume a pending export after auth (or an in-modal upgrade) completes.
  useEffect(() => {
    if (!pendingExport || authLoading || !user || !profile) return;
    if (profile.subscription_status !== "active") return;
    if (isPremium || !hasProLayers) {
      setPendingExport(false);
      setAuthMode(null);
      onExport();
    } else {
      // Signed up as Basic but the image needs Pro features — keep it blocked.
      setAuthMode("export-blocked");
    }
    // onExport is intentionally omitted (recreated each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExport, authLoading, user, isPremium, hasProLayers]);

  // On mount, restore a layer stack persisted before the auth flow (e.g. the
  // reload after email confirmation). The key is intentionally NOT cleared
  // here — it is cleared after a successful export or when a new base image is
  // uploaded, so the stack survives interruptions like the Stripe redirect.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(PENDING_LAYERS_KEY);
    } catch {
      saved = null;
    }
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as FilterLayer[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        dispatch({ type: "restore", layers: parsed });
        setShowRestoreBanner(true);
      }
    } catch {
      // Corrupt payload — ignore.
    }
  }, []);

  // After a Google OAuth signup, send the user to Stripe Checkout for the
  // chosen plan once their session is available (intent stashed in AuthModal).
  useEffect(() => {
    if (!user) return;
    let intent: string | null = null;
    try {
      intent = localStorage.getItem("picmagiq_oauth_intent");
    } catch {}
    if (intent === "premium" || intent === "basic") {
      try {
        localStorage.removeItem("picmagiq_oauth_intent");
      } catch {}
      const targetPriceId =
        intent === "premium"
          ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID;
      // Only redirect if not already on the correct or higher tier
      const alreadySubscribed =
        intent === "basic" ? profile?.subscription_status === "active" : isPremium;
      if (!alreadySubscribed) {
        fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: targetPriceId }),
        })
          .then((r) => r.json())
          .then(({ url }) => {
            preservePendingLayers();
            if (url) window.location.href = url;
          })
          .catch(console.error);
      }
    }
  }, [user]);

  // After an email/password signup that required confirmation, resume Stripe
  // Checkout on landing (intent + uid stashed in AuthModal before confirmation).
  useEffect(() => {
    if (!user) return;
    let intent: string | null = null;
    let uid: string | null = null;
    try {
      intent = localStorage.getItem("picmagiq_signup_intent");
      uid = localStorage.getItem("picmagiq_signup_uid");
    } catch {}
    if ((intent === "basic" || intent === "premium") && uid === user.id) {
      try {
        localStorage.removeItem("picmagiq_signup_intent");
        localStorage.removeItem("picmagiq_signup_uid");
      } catch {}
      const targetPriceId =
        intent === "premium"
          ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID;
      const alreadySubscribed = profile?.subscription_status === "active";
      if (!alreadySubscribed) {
        fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: targetPriceId }),
        })
          .then((r) => r.json())
          .then(({ url }) => {
            if (url) window.location.href = url;
          })
          .catch(console.error);
      }
    }
  }, [user]);

  const showOverlaySection = !!overlayPath;

  return (
    <div className="h-screen flex flex-col">
      {/* Top navigation — tab switcher between Editor and Composite */}
      <nav className="shrink-0 bg-ink-800 border-b border-ink-600 flex items-center px-4 h-10 gap-1">
        <span className="text-xs font-bold tracking-tight text-ink-100 mr-4">picmagIQ</span>
        {(["editor", "composite"] as const).map((tab) => {
          if (tab === "composite" && !isPremium) return null;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={[
                "text-xs px-3 py-1 rounded transition capitalize",
                mainTab === tab
                  ? "bg-ink-600 text-white font-medium"
                  : "text-ink-200 hover:text-white",
              ].join(" ")}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "composite" && (
                <span className="ml-1.5 rounded-sm bg-accent-500 text-ink-900 text-[9px] font-bold tracking-wider px-1 py-px leading-none">
                  Premium
                </span>
              )}
            </button>
          );
        })}

        {/* RIGHT-SIDE NAV GROUP */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="text-sm text-ink-200 hover:text-ink-100 transition px-3 py-1.5 rounded-md border border-ink-600 hover:border-ink-400"
          >
            Tutorial
          </button>

          {/* USER MENU — reads auth state from AuthContext */}
          <div className="relative">
          {!user ? (
            <button
              type="button"
              onClick={() => setAuthMode("sign-in")}
              className="text-xs px-3 py-1 rounded bg-ink-600 text-white font-medium hover:bg-ink-500 transition"
            >
              Sign In
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded text-ink-100 hover:bg-ink-700 transition max-w-[180px]"
              >
                <span className="truncate">{user.email}</span>
                <ChevronIcon open={userMenuOpen} />
              </button>
              {userMenuOpen && (
                <>
                  {/* click-away backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-ink-800 border border-ink-600 rounded-md shadow-lg z-50 p-2">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-[11px] text-ink-200">Plan</span>
                      <span
                        className={[
                          "rounded-sm text-[9px] font-bold tracking-wider px-1 py-px leading-none",
                          isPremium
                            ? "bg-accent-500 text-ink-900"
                            : "bg-ink-600 text-ink-100",
                        ].join(" ")}
                      >
                        {isPremium ? "PREMIUM" : "BASIC"}
                      </span>
                    </div>
                    {/* Active subscription (Basic or Premium): manage it.
                        No active subscription: offer upgrade to Premium. */}
                    {profile?.subscription_status === "active" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await fetch("/api/billing-portal", { method: "POST" });
                          const { url } = await res.json();
                          if (url) window.location.href = url;
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-ink-200 hover:bg-ink-700 transition-colors"
                      >
                        Manage Subscription
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await fetch("/api/checkout", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID }),
                          });
                          const { url } = await res.json();
                          if (url) window.location.href = url;
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-accent-400 hover:bg-ink-700 transition-colors"
                      >
                        Upgrade to Premium
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left text-xs text-ink-100 hover:bg-ink-700 rounded px-2 py-1.5 transition"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          </div>{/* end user menu */}
        </div>{/* end right-side nav group */}
      </nav>

      {/* Restore banner — sits between the nav and the editor area */}
      {showRestoreBanner && (
        <div className="shrink-0 flex items-center gap-3 bg-ink-700 border-b border-ink-600 px-4 py-2">
          <p className="flex-1 text-[13px] text-white">
            Your image settings were saved. Please re-upload your image and it
            will be available to export.
          </p>
          <button
            type="button"
            onClick={() => setShowRestoreBanner(false)}
            aria-label="Dismiss"
            className="shrink-0 text-ink-200 hover:text-white transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

    {/* Composite stays mounted (premium only) and is shown/hidden via display
        so its internal state (subjects, overlay, etc.) survives tab switches.
        display:contents keeps its full-height flex layout when visible. */}
    {isPremium && (
      <div style={{ display: mainTab === "composite" && isPremium ? "contents" : "none" }}>
        <CompositeWorkspace
          onExportReady={(url, filename) => {
            setExportFileName(filename);
            setDownloadUrl(url);
          }}
        />
      </div>
    )}
    <main
      style={{ display: mainTab !== "composite" || !isPremium ? "grid" : "none" }}
      className="flex-1 grid grid-cols-[380px_1fr] gap-0 grid-rows-[1fr] min-h-0 overflow-hidden"
    >
      {/* LEFT PANEL */}
      <aside className="bg-ink-800 border-r border-ink-600 p-6 overflow-y-auto max-h-full">
        <header className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight text-ink-100">
            picmagIQ
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">Professional image filters for your content</p>
        </header>

        <LayerHeader>Base Image</LayerHeader>

        <Section title="Source">
          <div className="flex items-center gap-2 min-w-0">
            <input
              ref={baseFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onUpload(e, "base")}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => baseFileRef.current?.click()}
              className="shrink-0 rounded-md bg-ink-600 text-ink-100 text-xs py-1.5 px-3 hover:bg-ink-500 transition"
            >
              Choose File
            </button>
            <span className="text-xs text-[#9CA3AF] truncate min-w-0">
              {uploadingBase
                ? "Uploading…"
                : basePath
                ? basePath.split("/").pop()
                : "No file chosen"}
            </span>
          </div>
        </Section>

        {/* TAB SWITCHER */}
        <div className="flex bg-ink-700 rounded-md p-0.5 mb-5 gap-0.5">
          {(["layers", "hsl", "curves"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "flex-1 text-xs py-1.5 rounded transition capitalize",
                activeTab === tab
                  ? "bg-ink-500 text-white font-medium"
                  : "text-[#9CA3AF] hover:text-white",
              ].join(" ")}
            >
              {tab === "hsl" ? "HSL" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "layers" && (
          <>
            <Section title="Filter Layers">
              <LayerStack
                layers={layers}
                activeLayerId={activeLayerId}
                onSelect={setActiveLayerId}
                onRemove={(id) => dispatch({ type: "remove", id })}
                onToggleVisible={(id) => dispatch({ type: "toggle-visible", id })}
                onSetIntensity={(id, intensity) =>
                  dispatch({ type: "set-intensity", id, intensity })
                }
                onSetMask={(id, mask) => dispatch({ type: "set-mask", id, mask })}
                onReorder={(from, to) => dispatch({ type: "reorder", from, to })}
                dragSrcIdx={dragSrcIdx}
              />
              <button
                type="button"
                disabled={layers.length >= 5}
                onClick={() => setShowPresetModal(true)}
                className="w-full mt-2 rounded-md border border-dashed border-ink-500 text-xs text-ink-200 py-2 hover:border-ink-400 hover:text-ink-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                + Add Layer{layers.length >= 5 ? " (max 5)" : ""}
              </button>
            </Section>

            {activeLayer && (
              <Section title="Fine Tuning">
                <FineTuningPanel
                  key={activeLayer.id}
                  preset={PRESETS_BY_ID[activeLayer.preset]}
                  params={activeLayer.params}
                  setParams={(params) =>
                    dispatch({ type: "set-params", id: activeLayer.id, params })
                  }
                />
              </Section>
            )}
          </>
        )}

        {activeTab === "hsl" && (
          <HslPanel
            hsl={hslAdjustments}
            onUpdate={updateHslChannel}
            onReset={resetHsl}
          />
        )}

        {activeTab === "curves" && (
          activeLayer ? (
            <CurvesPanel
              key={activeLayer.id}
              curves={activeLayer.curves}
              onUpdate={(curves) =>
                dispatch({ type: "set-curves", id: activeLayer.id, curves })
              }
            />
          ) : (
            <p className="text-xs text-ink-200 text-center py-6">
              Select a layer to edit its curves.
            </p>
          )
        )}

        <LayerHeader>Overlay Image</LayerHeader>

        <Section title="Source">
          <div className="flex items-center gap-2 min-w-0">
            <input
              ref={overlayFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onUpload(e, "overlay")}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => overlayFileRef.current?.click()}
              className="shrink-0 rounded-md bg-ink-600 text-ink-100 text-xs py-1.5 px-3 hover:bg-ink-500 transition"
            >
              Choose File
            </button>
            <span className="text-xs text-[#9CA3AF] truncate min-w-0 flex-1">
              {uploadingOverlay
                ? "Uploading…"
                : overlayPath
                ? overlayPath.split("/").pop()
                : "No file chosen"}
            </span>
            {overlayPath && !uploadingOverlay && (
              <button
                type="button"
                onClick={removeOverlay}
                className="shrink-0 text-[11px] text-[#9CA3AF] hover:text-white transition"
              >
                Remove
              </button>
            )}
          </div>
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
          <div className="mb-3">
            <label className="block text-xs text-ink-100 mb-1">
              Width (px) <span className="text-ink-100">— leave blank to export at original size</span>
            </label>
            <input
              type="number"
              min={1}
              value={exportWidth}
              onChange={(e) => setExportWidth(e.target.value)}
              placeholder="New width in px"
              className="w-full bg-ink-800 border border-ink-600 rounded-md px-3 py-1.5 text-sm text-ink-100 placeholder:text-ink-100 focus:outline-none focus:border-accent-500 transition"
            />
          </div>
          <div
            role="group"
            aria-label="Export format"
            className="flex gap-1 mb-2"
          >
            {(["webp", "jpeg", "png"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  setExportFormat(fmt);
                  setDownloadUrl(null);
                }}
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
            disabled={!basePath || exporting}
            onClick={handleExportClick}
            className="w-full rounded-md bg-accent-500 hover:bg-accent-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 transition shadow-[0_0_12px_rgba(239,108,78,0.25)]"
          >
            {exporting ? "Rendering export…" : "Export"}
          </button>
          {uploadError && (
            <p className="text-xs text-red-400 mt-2">{uploadError}</p>
          )}
        </Section>
      </aside>

      {/* RIGHT PANEL */}
      <section className="bg-ink-900 flex flex-col">
        <div className="border-b border-ink-600 px-6 py-3 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-ink-200">
            Preview
          </span>
          <span className="text-[11px] text-ink-200">
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
          {!basePath && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_center,_#1a1a20_0%,_#0b0b0d_70%)] pointer-events-none">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#4a4a57" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-[#9CA3AF]">Upload an image to get started</p>
                <p className="text-xs text-[#6B7280] mt-1.5">Supports JPEG, PNG, and WebP</p>
              </div>
            </div>
          )}
          {basePath && focalLayer && focalActive && (
            <FocalBlurOverlay
              key={focalLayer.id}
              params={focalLayer.params}
              isActive={focalActive}
              onChange={(params) =>
                dispatch({ type: "set-params", id: focalLayer.id, params })
              }
              onDeselect={() => setActiveLayerId("")}
            />
          )}
          {/* When the Focal Blur box is hidden (its layer isn't active), offer a
              way back in. Re-selecting the layer re-renders the box at its last
              set position. */}
          {basePath && focalLayer && !focalActive && (
            <button
              type="button"
              onClick={() => setActiveLayerId(focalLayer.id)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-900/80 text-white text-xs px-3 py-1.5 hover:bg-ink-800/80 transition"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="7" />
                <line x1="12" y1="1" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="23" />
                <line x1="1" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="23" y2="12" />
              </svg>
              Edit Focal Region
            </button>
          )}
        </div>
      </section>

      {/* PRESET MODAL */}
      {showPresetModal && (
        <PresetModal
          onClose={() => setShowPresetModal(false)}
          onSelect={addLayer}
          existingPresets={layers.map((l) => l.preset)}
          // Lock Pro presets for authenticated Basic users (isPremium from
          // AuthContext). Unauthenticated users keep full access — they are
          // gated at Export instead.
          lockProPresets={!!user && !isPremium}
        />
      )}

      {/* AI TUTOR — fixed floating chat button + drawer.
          Hidden for Basic and unauthenticated users (isPremium from AuthContext). */}
      <AiTutor layers={layers} hslAdjustments={hslAdjustments} isPremium={isPremium} />
    </main>

      {/* EXPORT READY MODAL — top level so it renders on either tab (editor
          export or composite export both set downloadUrl). */}
      {downloadUrl && (
        <ExportReadyModal
          downloadUrl={downloadUrl}
          fileName={exportFileName ?? undefined}
          onClose={() => { setDownloadUrl(null); setExportFileName(null); }}
        />
      )}

      {/* AUTH MODAL — export gate + nav Sign In (state from AuthContext) */}
      {authMode && (
        <AuthModal
          key={authMode}
          initialMode={authMode}
          hasProLayers={hasProLayers}
          onClose={closeAuthModal}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* TUTORIAL MODAL */}
      {showTutorial && (
        <TutorialModal onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}

// ---------- Layer Stack ----------

function LayerStack({
  layers,
  activeLayerId,
  onSelect,
  onRemove,
  onToggleVisible,
  onSetIntensity,
  onSetMask,
  onReorder,
  dragSrcIdx,
}: {
  layers: FilterLayer[];
  activeLayerId: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onSetIntensity: (id: string, intensity: number) => void;
  onSetMask: (id: string, mask: LayerMask) => void;
  onReorder: (from: number, to: number) => void;
  dragSrcIdx: React.MutableRefObject<number | null>;
}) {
  if (layers.length === 0) {
    return (
      <p className="text-xs text-ink-200 mb-2">
        No layers yet — add one below.
      </p>
    );
  }
  return (
    <div className="space-y-2 mb-2">
      {layers.map((layer, index) => (
        <LayerCard
          key={layer.id}
          layer={layer}
          index={index}
          isActive={layer.id === activeLayerId}
          onSelect={() => onSelect(layer.id)}
          onRemove={() => onRemove(layer.id)}
          onToggleVisible={() => onToggleVisible(layer.id)}
          onSetIntensity={(v) => onSetIntensity(layer.id, v)}
          onSetMask={(mask) => onSetMask(layer.id, mask)}
          dragSrcIdx={dragSrcIdx}
          onReorder={onReorder}
        />
      ))}
    </div>
  );
}

function isMaskActive(mask: LayerMask): boolean {
  return (
    mask.luminosity.enabled ||
    (mask.colorRange.enabled && mask.colorRange.activeChannels.length > 0)
  );
}

function LayerCard({
  layer,
  index,
  isActive,
  onSelect,
  onRemove,
  onToggleVisible,
  onSetIntensity,
  onSetMask,
  dragSrcIdx,
  onReorder,
}: {
  layer: FilterLayer;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onToggleVisible: () => void;
  onSetIntensity: (v: number) => void;
  onSetMask: (mask: LayerMask) => void;
  dragSrcIdx: React.MutableRefObject<number | null>;
  onReorder: (from: number, to: number) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [maskOpen, setMaskOpen] = useState(false);
  const preset = PRESETS_BY_ID[layer.preset];

  return (
    <div
      className={[
        "rounded-md border p-2 cursor-pointer transition-colors select-none",
        isActive
          ? "border-accent-500 bg-ink-700"
          : "border-ink-600 bg-ink-700/60 hover:border-ink-400",
        isDragOver ? "border-accent-500/60 ring-1 ring-accent-500/30" : "",
        !layer.visible ? "opacity-50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragEnter={() => setIsDragOver(true)}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (dragSrcIdx.current === null || dragSrcIdx.current === index) return;
        onReorder(dragSrcIdx.current, index);
        dragSrcIdx.current = null;
      }}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle — only this element initiates a drag */}
        <span
          draggable
          onDragStart={() => {
            dragSrcIdx.current = index;
          }}
          onDragEnd={() => {
            dragSrcIdx.current = null;
            setIsDragOver(false);
          }}
        >
          <GripIcon />
        </span>

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
          className="shrink-0 text-ink-100 hover:text-white transition-colors"
          aria-label={layer.visible ? "Hide layer" : "Show layer"}
        >
          <EyeIcon open={layer.visible} />
        </button>

        {/* Preset name */}
        <span className="flex-1 text-xs text-ink-100 truncate min-w-0 mr-auto">
          {preset.name}
        </span>

        {/* Right-side actions — always visible, never compressed */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Premium badge */}
          {preset.pro && (
            <span className="rounded-sm bg-accent-500 text-ink-900 text-[9px] font-bold tracking-wider px-1 py-px leading-none">
              Premium
            </span>
          )}

          {/* Mask toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMaskOpen((v) => !v);
            }}
            className={[
              "text-[9px] font-medium px-1.5 py-0.5 rounded border transition-colors",
              maskOpen || isMaskActive(layer.mask)
                ? "border-accent-500 text-accent-400 bg-accent-500/10"
                : "border-ink-400 text-ink-200 hover:text-white hover:border-ink-300",
            ].join(" ")}
            aria-label="Toggle mask panel"
          >
            MASK
          </button>

          {/* Remove */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-ink-200 hover:text-red-400 transition-colors"
            aria-label="Remove layer"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Inline mask panel */}
      {maskOpen && (
        <MaskPanel
          mask={layer.mask}
          onUpdate={onSetMask}
        />
      )}
    </div>
  );
}

// ---------- Mask Panel ----------

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={[
        "relative shrink-0 w-11 h-6 rounded-full border border-ink-300 transition-colors",
        checked ? "bg-accent-500" : "bg-ink-600",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all",
          checked ? "left-[23px]" : "left-[3px]",
        ].join(" ")}
      />
    </button>
  );
}

function DualRangeSlider({
  min,
  max,
  low,
  high,
  onChangeLow,
  onChangeHigh,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  onChangeLow: (v: number) => void;
  onChangeHigh: (v: number) => void;
}) {
  return (
    <div className="relative h-5">
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={low}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChangeLow(Math.min(v, high - 1));
        }}
        className="absolute w-full pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        style={{ zIndex: 2 }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={high}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChangeHigh(Math.max(v, low + 1));
        }}
        className="absolute w-full pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
        style={{ zIndex: 3 }}
      />
    </div>
  );
}

function MaskPanel({
  mask,
  onUpdate,
}: {
  mask: LayerMask;
  onUpdate: (mask: LayerMask) => void;
}) {
  const [lumOpen, setLumOpen] = useState(mask.luminosity.enabled);
  const [colorOpen, setColorOpen] = useState(mask.colorRange.enabled);

  const setLum = (patch: Partial<LayerMask["luminosity"]>) =>
    onUpdate({ ...mask, luminosity: { ...mask.luminosity, ...patch } });

  const setColor = (patch: Partial<LayerMask["colorRange"]>) =>
    onUpdate({ ...mask, colorRange: { ...mask.colorRange, ...patch } });

  const setChannelSetting = (patch: Partial<MaskChannelSettings>) => {
    const ch = mask.colorRange.focusedChannel;
    if (!ch) return;
    const existing = mask.colorRange.channels ?? defaultChannels();
    onUpdate({
      ...mask,
      colorRange: {
        ...mask.colorRange,
        channels: { ...existing, [ch]: { ...existing[ch], ...patch } },
      },
    });
  };

  // Backwards compat: old state had a single `channel` field.
  const cr = mask.colorRange;
  const activeChannels: MaskChannel[] =
    cr.activeChannels ?? ((cr as any).channel ? [(cr as any).channel as MaskChannel] : []);
  const focusedCh: MaskChannel | null =
    cr.focusedChannel !== undefined
      ? cr.focusedChannel
      : ((cr as any).channel as MaskChannel | null) ?? null;
  const chSettings = focusedCh
    ? (cr.channels ?? defaultChannels())[focusedCh]
    : null;

  return (
    <div
      className="mt-2 pt-2 border-t border-ink-600 space-y-1"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Luminosity subsection */}
      <div className="rounded border border-ink-600 overflow-hidden">
        <button
          type="button"
          onClick={() => setLumOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-ink-700/50 transition"
        >
          <span className="flex-1 text-[11px] text-ink-200">Luminosity</span>
          <ToggleSwitch
            checked={mask.luminosity.enabled}
            onChange={(enabled) => {
              setLum({ enabled });
              if (enabled) setLumOpen(true);
            }}
          />
        </button>
        {lumOpen && (
          <div
            className={[
              "px-2 pb-2 pt-1 space-y-2 border-t border-ink-600 bg-ink-700/20",
              !mask.luminosity.enabled ? "opacity-40 pointer-events-none" : "",
            ].join(" ")}
          >
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-ink-200">Range</span>
                <span className="text-[10px] text-ink-200 tabular-nums">
                  {mask.luminosity.min}–{mask.luminosity.max}
                </span>
              </div>
              <DualRangeSlider
                min={0}
                max={255}
                low={mask.luminosity.min}
                high={mask.luminosity.max}
                onChangeLow={(min) => setLum({ min })}
                onChangeHigh={(max) => setLum({ max })}
              />
            </div>
            <label className="block">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-ink-200">Smoothness</span>
                <span className="text-[10px] text-ink-200 tabular-nums">
                  {mask.luminosity.smoothness}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={mask.luminosity.smoothness}
                onChange={(e) => setLum({ smoothness: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[10px] text-ink-200">Invert</span>
              <input
                type="checkbox"
                checked={mask.luminosity.invert}
                onChange={(e) => setLum({ invert: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-ink-500 bg-ink-700 text-accent-500 focus:ring-accent-500"
              />
            </label>
          </div>
        )}
      </div>

      {/* Color Range subsection */}
      <div className="rounded border border-ink-600 overflow-hidden">
        <button
          type="button"
          onClick={() => setColorOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-ink-700/50 transition"
        >
          <span className="flex-1 text-[11px] text-ink-200">Color Range</span>
          <ToggleSwitch
            checked={mask.colorRange.enabled}
            onChange={(enabled) => {
              setColor({ enabled });
              if (enabled) setColorOpen(true);
            }}
          />
        </button>
        {colorOpen && (
          <div
            className={[
              "px-2 pb-2 pt-1 space-y-2 border-t border-ink-600 bg-ink-700/20",
              !mask.colorRange.enabled ? "opacity-40 pointer-events-none" : "",
            ].join(" ")}
          >
            <div>
              <span className="text-[10px] text-ink-200 block mb-1.5">
                Channels
              </span>
              <div className="flex flex-wrap gap-1">
                {MASK_CHANNEL_DEFS.map(({ key, label, color }) => {
                  const isActive = activeChannels.includes(key);
                  return (
                    <div key={key} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isActive) {
                            setColor({ activeChannels: [...activeChannels, key], focusedChannel: key });
                          } else {
                            setColor({ focusedChannel: key });
                          }
                        }}
                        className={[
                          "text-[10px] w-6 h-6 rounded-full border transition font-medium",
                          isActive
                            ? "border-current"
                            : "border-ink-600 text-ink-200 hover:text-ink-200 hover:border-ink-400",
                        ].join(" ")}
                        style={isActive ? { color, borderColor: color } : undefined}
                      >
                        {label}
                      </button>
                      {isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newActive = activeChannels.filter((k) => k !== key);
                            const newFocused =
                              focusedCh === key ? (newActive[0] ?? null) : focusedCh;
                            setColor({ activeChannels: newActive, focusedChannel: newFocused });
                          }}
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ink-500 hover:bg-ink-400 text-ink-100 flex items-center justify-center text-[8px] leading-none"
                          aria-label={`Remove ${key}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {chSettings === null ? (
              <p className="text-[10px] text-ink-100 text-center py-1">
                Select a channel to adjust its settings.
              </p>
            ) : (
              <>
                <p className="text-[10px] font-medium text-ink-200">
                  {focusedCh!.charAt(0).toUpperCase() + focusedCh!.slice(1)}
                </p>
                <label className="block">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] text-ink-200">Expansion</span>
                    <span className="text-[10px] text-ink-200 tabular-nums">
                      {chSettings.expansion}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={chSettings.expansion}
                    onChange={(e) => setChannelSetting({ expansion: Number(e.target.value) })}
                    className="w-full"
                  />
                </label>
                <label className="block">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] text-ink-200">Smoothness</span>
                    <span className="text-[10px] text-ink-200 tabular-nums">
                      {chSettings.smoothness}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={chSettings.smoothness}
                    onChange={(e) => setChannelSetting({ smoothness: Number(e.target.value) })}
                    className="w-full"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-ink-200">Invert</span>
                  <input
                    type="checkbox"
                    checked={chSettings.invert}
                    onChange={(e) => setChannelSetting({ invert: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-ink-500 bg-ink-700 text-accent-500 focus:ring-accent-500"
                  />
                </label>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Export ready modal ----------

function ExportReadyModal({
  downloadUrl,
  fileName: fileNameProp,
  onClose,
}: {
  downloadUrl: string;
  fileName?: string;
  onClose: () => void;
}) {
  const fileName = fileNameProp ?? downloadUrl.split("/").pop() ?? "export";
  const format = (fileName.split(".").pop() || "").toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-ink-800 border border-ink-600 rounded-lg p-6 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-ink-200 hover:text-white transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <p className="text-sm font-medium text-white pr-6">
          Your export is ready
        </p>
        <p className="text-xs text-ink-200 mt-1 break-all">
          {format} · {fileName}
        </p>

        <a
          href={downloadUrl}
          download={fileName}
          className="block w-full text-center mt-5 rounded-md bg-accent-500 hover:bg-accent-400 text-white font-semibold text-sm py-2.5 transition shadow-[0_0_12px_rgba(239,108,78,0.25)]"
        >
          Download
        </a>
      </div>
    </div>
  );
}

// ---------- Preset Modal ----------

function PresetModal({
  onClose,
  onSelect,
  existingPresets,
  lockProPresets,
}: {
  onClose: () => void;
  onSelect: (id: PresetId) => void;
  existingPresets: PresetId[];
  lockProPresets: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focal Blur is limited to one layer — hide it once one already exists.
  const availablePresets = PRESETS.filter(
    (p) => p.id !== "focal-blur" || !existingPresets.includes("focal-blur"),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-ink-800 border border-ink-600 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-100">
            Add Filter Layer
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-200 hover:text-ink-100 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {availablePresets.map((p) => {
            // Pro cards stay visible but are locked for Basic users.
            const locked = !!p.pro && lockProPresets;
            return (
              <button
                key={p.id}
                type="button"
                disabled={locked}
                onClick={() => onSelect(p.id)}
                className={[
                  "relative text-left rounded-md border px-3 py-2 transition",
                  locked
                    ? "border-ink-600 bg-ink-700/40 opacity-60 cursor-not-allowed"
                    : "border-ink-600 bg-ink-700/60 hover:border-accent-500",
                ].join(" ")}
              >
                {p.pro && (
                  <span className="absolute top-1.5 right-1.5 rounded-sm bg-accent-500 text-ink-900 text-[9px] font-bold tracking-wider px-1 py-px leading-none">
                    Premium
                  </span>
                )}
                <div className="text-sm text-ink-100 pr-7">{p.name}</div>
                <div className="text-[11px] text-ink-200 mt-0.5 leading-snug">
                  {locked ? "Premium only" : p.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Focal Blur bounding-box overlay ----------

type FocalBox = { x: number; y: number; w: number; h: number }; // fractions, top-left origin
type FocalHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type FocalDrag =
  | { kind: "move"; startX: number; startY: number; orig: FocalBox }
  | { kind: "resize"; handle: FocalHandle; startX: number; startY: number; orig: FocalBox };

const FOCAL_HANDLE_CURSORS: Record<FocalHandle, string> = {
  nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize",
  e:  "ew-resize",   s: "ns-resize", se: "nwse-resize",
  sw: "nesw-resize", w: "ew-resize",
};
const FOCAL_MIN = 0.1; // minimum box size: 10% of preview width/height

// Interactive bounding box drawn over the preview panel for the Focal Blur
// preset. The box lives in local state so dragging and resizing it never
// touches the layer params or triggers a (slow) WebGL re-render. The user
// commits the box with the "Apply Blur" button, which writes focalX/focalY/
// focalW/focalH/focalRadius onto the layer and triggers a single re-render.
// Positions/sizes are 0–1 fractions of the preview panel so they survive
// panel resizes.
function FocalBlurOverlay({
  params,
  isActive,
  onChange,
  onDeselect,
}: {
  params: Params;
  isActive: boolean;
  onChange: (params: Params) => void;
  onDeselect: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [applying, setApplying] = useState(false);
  const dragRef = useRef<FocalDrag | null>(null);
  // Pointer-down position for a click on the backdrop, used to tell a plain
  // click (deselect) from a drag gesture (ignore).
  const deselectDownRef = useRef<{ x: number; y: number } | null>(null);

  // Box geometry, local to the overlay until the user clicks Apply. Seeded from
  // any previously-applied params, otherwise the default centered middle third.
  const [box, setBox] = useState<FocalBox>(() => {
    const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
    const fw = num(params.focalW, 1 / 3);
    const fh = num(params.focalH, 1 / 3);
    const fx = num(params.focalX, 0.5);
    const fy = num(params.focalY, 0.5);
    return { x: fx - fw / 2, y: fy - fh / 2, w: fw, h: fh };
  });

  // Track the panel's pixel size so handles render at a fixed pixel radius and
  // so focalRadius (a fraction of the shorter pixel dimension) can be derived.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ptFromEvent = (e: React.PointerEvent | React.MouseEvent) => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  // Cursor shown on the SVG; reflects the in-progress drag (move / resize dir).
  const cursorForDrag = (d: FocalDrag | null) =>
    !d ? "default" : d.kind === "move" ? "move" : FOCAL_HANDLE_CURSORS[d.handle];

  // Pointer capture routes every subsequent pointer event to the SVG element,
  // regardless of what sits underneath (notably the preview iframe). This is
  // what prevents a drag from getting "stuck" when a mouseup lands on the
  // iframe, which would otherwise never reach a window listener.
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isActive) return;
    const target = e.target as Element;
    const role = target.getAttribute("data-focal-role");
    if (role !== "move" && role !== "resize") return;
    e.preventDefault();
    const pt = ptFromEvent(e);
    if (role === "move") {
      dragRef.current = { kind: "move", startX: pt.x, startY: pt.y, orig: box };
    } else {
      const handle = target.getAttribute("data-focal-handle") as FocalHandle;
      dragRef.current = { kind: "resize", handle, startX: pt.x, startY: pt.y, orig: box };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Dragging updates local state ONLY — no params write, no preview re-render.
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const el = containerRef.current;
    if (!drag || !el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    if (drag.kind === "move") {
      const x = Math.max(0, Math.min(1 - drag.orig.w, drag.orig.x + (px - drag.startX)));
      const y = Math.max(0, Math.min(1 - drag.orig.h, drag.orig.y + (py - drag.startY)));
      setBox({ x, y, w: drag.orig.w, h: drag.orig.h });
    } else {
      const dx = px - drag.startX;
      const dy = py - drag.startY;
      const hd = drag.handle;
      let { x, y, w, h } = drag.orig;
      if (hd.includes("w")) { x += dx; w -= dx; }
      if (hd.includes("e")) { w += dx; }
      if (hd.includes("n")) { y += dy; h -= dy; }
      if (hd.includes("s")) { h += dy; }
      if (w < FOCAL_MIN) { if (hd.includes("w")) x = drag.orig.x + drag.orig.w - FOCAL_MIN; w = FOCAL_MIN; }
      if (h < FOCAL_MIN) { if (hd.includes("n")) y = drag.orig.y + drag.orig.h - FOCAL_MIN; h = FOCAL_MIN; }
      x = Math.max(0, Math.min(1 - FOCAL_MIN, x));
      y = Math.max(0, Math.min(1 - FOCAL_MIN, y));
      if (x + w > 1) w = 1 - x;
      if (y + h > 1) h = 1 - y;
      setBox({ x, y, w, h });
    }
  };

  // Releasing (or cancelling) the pointer ends the drag cleanly.
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  // Commit the current box to the layer params and trigger a single re-render.
  // Shows a brief "Applying…" state until the preview reports a completed
  // render (with a safety timeout in case no message arrives).
  const handleApply = () => {
    if (applying) return;
    const shorter = Math.min(size.w, size.h) || 1;
    const focalRadius = ((box.w * size.w) / 2 + (box.h * size.h) / 2) / 2 / shorter;
    setApplying(true);

    let done = false;
    let timer = 0;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onRendered);
      window.clearTimeout(timer);
      setApplying(false);
    };
    function onRendered(ev: MessageEvent) {
      if (ev.data && typeof ev.data === "object" && ev.data.type === "rendered") finish();
    }
    timer = window.setTimeout(finish, 2500);
    window.addEventListener("message", onRendered);

    onChange({
      ...params,
      focalX: box.x + box.w / 2,
      focalY: box.y + box.h / 2,
      focalW: box.w,
      focalH: box.h,
      focalRadius,
    });
  };

  const W = size.w;
  const H = size.h;
  const bx = box.x * W;
  const by = box.y * H;
  const bw = box.w * W;
  const bh = box.h * H;
  const handles: { id: FocalHandle; x: number; y: number }[] = [
    { id: "nw", x: bx,            y: by },
    { id: "n",  x: bx + bw / 2,   y: by },
    { id: "ne", x: bx + bw,       y: by },
    { id: "e",  x: bx + bw,       y: by + bh / 2 },
    { id: "se", x: bx + bw,       y: by + bh },
    { id: "s",  x: bx + bw / 2,   y: by + bh },
    { id: "sw", x: bx,            y: by + bh },
    { id: "w",  x: bx,            y: by + bh / 2 },
  ];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ pointerEvents: "none" }}
    >
      {/* Backdrop click target — sits below the SVG so the box rect and handles
          still win their hits. A plain click here (no drag) deselects the layer
          and dims the box; box drags go to the captured SVG and never reach it.
          Rendered only when active so it never blocks the preview otherwise. */}
      {isActive && (
        <div
          className="absolute inset-0"
          style={{ pointerEvents: "auto" }}
          onPointerDown={(e) => {
            deselectDownRef.current = { x: e.clientX, y: e.clientY };
          }}
          onClick={(e) => {
            const down = deselectDownRef.current;
            deselectDownRef.current = null;
            if (!down) return;
            const moved =
              Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4;
            if (!moved) onDeselect();
          }}
        />
      )}
      <svg
        width={W}
        height={H}
        className="absolute left-0 top-0"
        style={{ touchAction: "none", cursor: cursorForDrag(dragRef.current) }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Dark overlay outside the focal region — visible only when active */}
        {isActive && W > 0 && H > 0 && (
          <>
            <rect x={0} y={0} width={W} height={by} fill="rgba(0,0,0,0.45)" />
            <rect x={0} y={by + bh} width={W} height={Math.max(0, H - by - bh)} fill="rgba(0,0,0,0.45)" />
            <rect x={0} y={by} width={bx} height={bh} fill="rgba(0,0,0,0.45)" />
            <rect x={bx + bw} y={by} width={Math.max(0, W - bx - bw)} height={bh} fill="rgba(0,0,0,0.45)" />
          </>
        )}

        {/* Box border (and move target when active) */}
        <rect
          data-focal-role="move"
          x={bx}
          y={by}
          width={bw}
          height={bh}
          fill="transparent"
          stroke="white"
          strokeWidth={2}
          strokeDasharray="6 4"
          style={{
            pointerEvents: isActive ? "all" : "none",
            cursor: isActive ? "move" : "default",
          }}
        />

        {/* Anchor handles — 4 corners + 4 edge midpoints */}
        {handles.map((hnd) => (
          <circle
            key={hnd.id}
            data-focal-role="resize"
            data-focal-handle={hnd.id}
            cx={hnd.x}
            cy={hnd.y}
            r={4}
            fill="white"
            stroke="#1a1a1a"
            strokeWidth={1}
            style={{
              pointerEvents: isActive ? "all" : "none",
              cursor: isActive ? FOCAL_HANDLE_CURSORS[hnd.id] : "default",
            }}
          />
        ))}
      </svg>

      {/* Tooltip pinned to the top-right corner — hidden when dimmed */}
      {isActive && W > 0 && (
        <div
          className="absolute rounded bg-ink-900/90 text-white px-1.5 py-0.5 leading-none"
          style={{
            left: bx + bw,
            top: by,
            transform: "translate(-100%, -130%)",
            fontSize: 11,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Focal Region
        </div>
      )}

      {/* Apply Blur — commits the box and renders. Hidden when dimmed. */}
      {isActive && W > 0 && (
        <button
          type="button"
          disabled={applying}
          onClick={handleApply}
          className="absolute rounded-md bg-accent-500 hover:bg-accent-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-xs px-3 py-1 shadow-[0_0_12px_rgba(239,108,78,0.25)]"
          style={{
            left: bx + bw / 2,
            top: by + bh,
            transform: "translate(-50%, 8px)",
            pointerEvents: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {applying ? "Applying…" : "Apply Blur"}
        </button>
      )}
    </div>
  );
}

// ---------- Fine-tuning panel (bound to the active layer) ----------

function FineTuningPanel({
  preset,
  params,
  setParams,
}: {
  preset: PresetDef;
  params: Params;
  setParams: (params: Params) => void;
}) {
  const setParam = (key: string, value: string | number | boolean) =>
    setParams({ ...params, [key]: value });

  const standard = useMemo(
    () => preset.controls.filter((c) => !c.pro),
    [preset],
  );
  const proControls = useMemo(
    () => preset.controls.filter((c) => c.pro),
    [preset],
  );

  return (
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
              Premium Enhancements
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
  );
}

// ---------- Overlay filter panel (preset grid + fine tuning) ----------

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
                  Premium
                </span>
              )}
              <div className="text-sm text-ink-100 pr-7">{p.name}</div>
              <div className="text-[11px] text-ink-200 mt-0.5 leading-snug">
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
                  Premium Enhancements
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

// ---------- Shared primitives ----------

function LayerHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.15em] text-accent-400 font-bold mb-3 mt-2 pb-1 border-b border-accent-500/30">
      {children}
    </div>
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
      <h2 className="text-[11px] uppercase tracking-wider text-ink-200 mb-2">
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
        <span className="text-[11px] text-ink-200 tabular-nums">{value}</span>
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

// ---------- Curves panel ----------

function drawCurveCanvas(
  canvas: HTMLCanvasElement,
  points: CurvePoint[],
  color: string,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const SZ = 256;

  // Background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, SZ, SZ);

  // 4×4 grid
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const v = (i / 4) * SZ;
    ctx.beginPath(); ctx.moveTo(v, 0);  ctx.lineTo(v, SZ); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, v);  ctx.lineTo(SZ, v); ctx.stroke();
  }

  // Diagonal baseline (dashed)
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "#444444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, SZ);
  ctx.lineTo(SZ, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  if (points.length < 2) {
    if (points.length === 1) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(points[0][0], SZ - 1 - points[0][1], 4, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  const sorted = points.slice().sort((a, b) => a[0] - b[0]);
  const n  = sorted.length;
  const xs = sorted.map((p) => p[0]);
  const ys = sorted.map((p) => p[1]);

  // Monotonic cubic spline tangents (Fritsch-Carlson)
  const delta: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    const dx = xs[k + 1] - xs[k];
    delta.push(dx < 1e-10 ? 0 : (ys[k + 1] - ys[k]) / dx);
  }
  const m: number[] = new Array(n);
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

  // y is flipped: canvas y = SZ - 1 - output
  const cy = (v: number) => SZ - 1 - v;

  // Draw curve via hermite→bezier conversion
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xs[0], cy(ys[0]));
  for (let k = 0; k < n - 1; k++) {
    const h = xs[k + 1] - xs[k];
    if (h < 1e-10) continue;
    ctx.bezierCurveTo(
      xs[k] + h / 3,     cy(ys[k] + m[k] * h / 3),
      xs[k + 1] - h / 3, cy(ys[k + 1] - m[k + 1] * h / 3),
      xs[k + 1],         cy(ys[k + 1]),
    );
  }
  ctx.stroke();

  // Control points
  for (const [ix, iy] of sorted) {
    ctx.beginPath();
    ctx.arc(ix, cy(iy), 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#111111";
    ctx.stroke();
  }
}

function CurvesPanel({
  curves,
  onUpdate,
}: {
  curves: LayerCurves;
  onUpdate: (c: LayerCurves) => void;
}) {
  const [activeCh, setActiveCh] = useState<CurveChannel>("rgb");
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const dragging   = useRef<number | null>(null);
  // Keep a ref to the latest activePts so event handlers never see stale state.
  const latestPts  = useRef<CurvePoint[]>(curves[activeCh]);

  const activePts = curves[activeCh];
  const chColor   = CURVE_CHANNEL_DEFS.find((d) => d.key === activeCh)!.color;

  // Keep latestPts in sync on every render.
  latestPts.current = activePts;

  useEffect(() => {
    const c = canvasRef.current;
    if (c) drawCurveCanvas(c, activePts, chColor);
  }, [activePts, chColor]);

  function setCurve(pts: CurvePoint[]) {
    const sorted = pts.slice().sort((a, b) => a[0] - b[0]);
    onUpdate({ ...curves, [activeCh]: sorted });
  }

  function toPoint(e: React.MouseEvent<HTMLCanvasElement>): CurvePoint {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const input  = Math.max(0, Math.min(255, Math.round((e.clientX - r.left) * 256 / r.width)));
    const output = Math.max(0, Math.min(255, 255 - Math.round((e.clientY - r.top) * 256 / r.height)));
    return [input, output];
  }

  function hitTest(pt: CurvePoint): number {
    const pts = latestPts.current;
    const HIT = 14; // hit radius in curve space
    for (let i = pts.length - 1; i >= 0; i--) {
      const dx = pt[0] - pts[i][0];
      const dy = pt[1] - pts[i][1];
      if (dx * dx + dy * dy < HIT * HIT) return i;
    }
    return -1;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const pt  = toPoint(e);
    const idx = hitTest(pt);
    if (idx >= 0) {
      dragging.current = idx;
      return;
    }
    const pts = latestPts.current;
    if (pts.length >= 10) return;
    // Add new point, then track its sorted index.
    const next   = [...pts, pt];
    const sorted = next.slice().sort((a, b) => a[0] - b[0]);
    dragging.current = sorted.indexOf(pt);
    onUpdate({ ...curves, [activeCh]: sorted });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (dragging.current === null) return;
    e.preventDefault();
    const idx = dragging.current;
    const pts = latestPts.current;
    if (idx >= pts.length) return;
    const [nx, ny] = toPoint(e);
    const orig      = pts[idx];
    const isEndpt   = orig[0] === 0 || orig[0] === 255;
    const clampedX  = isEndpt
      ? orig[0]
      : Math.max(
          idx > 0 ? pts[idx - 1][0] + 1 : 1,
          Math.min(idx < pts.length - 1 ? pts[idx + 1][0] - 1 : 254, nx),
        );
    const next = pts.map<CurvePoint>((p, i) => (i === idx ? [clampedX, ny] : p));
    onUpdate({ ...curves, [activeCh]: next });
  }

  function handleMouseUp() {
    dragging.current = null;
  }

  function handleRemove(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const pt  = toPoint(e);
    const idx = hitTest(pt);
    if (idx < 0) return;
    const pts = latestPts.current;
    const p   = pts[idx];
    if (p[0] === 0 || p[0] === 255) return; // endpoints are locked
    setCurve(pts.filter((_, i) => i !== idx));
  }

  return (
    <section className="mb-6">
      {/* Channel selector + reset buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {CURVE_CHANNEL_DEFS.map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCh(key)}
              className={[
                "text-[10px] font-medium px-2 py-0.5 rounded border transition",
                activeCh === key
                  ? "border-current"
                  : "border-[#4a4a57] text-[#9CA3AF] hover:text-white hover:border-[#6a6a78]",
              ].join(" ")}
              style={activeCh === key ? { color, borderColor: color } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCurve([[0, 0], [255, 255]])}
            className="text-[11px] text-[#9CA3AF] hover:text-white transition"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onUpdate(defaultLayerCurves())}
            className="text-[11px] text-[#9CA3AF] hover:text-white transition"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Interactive curve canvas */}
      <div className="w-full aspect-square rounded overflow-hidden border border-ink-600">
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          className="w-full h-full block cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleRemove}
          onDoubleClick={handleRemove}
        />
      </div>

      <p className="text-[10px] text-[#6B7280] mt-1.5 leading-snug">
        Click to add point · Drag to move · Right-click or double-click to remove
      </p>
    </section>
  );
}

// ---------- HSL panel ----------

function HslPanel({
  hsl,
  onUpdate,
  onReset,
}: {
  hsl: HslState;
  onUpdate: (channel: keyof HslState, prop: keyof HslChannel, value: number) => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggleChannel = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-wider text-ink-200">
          HSL / Color
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-[#9CA3AF] hover:text-white transition"
        >
          Reset All
        </button>
      </div>
      <div className="space-y-1">
        {HSL_CHANNEL_DEFS.map(({ key, label, color }) => {
          const adj = hsl[key];
          const isActive =
            adj.hue !== 0 || adj.saturation !== 0 || adj.luminance !== 0;
          const isExpanded = expanded.has(key);
          return (
            <div
              key={key}
              className="rounded-md border border-ink-600 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleChannel(key)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-ink-700/50 transition"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: color }}
                />
                <span className="flex-1 text-xs text-ink-100">{label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                )}
                <ChevronIcon open={isExpanded} />
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 pt-2 space-y-3 border-t border-ink-600 bg-ink-700/20">
                  <HslSlider
                    label="Hue"
                    min={-180}
                    max={180}
                    value={adj.hue}
                    onChange={(v) => onUpdate(key, "hue", v)}
                  />
                  <HslSlider
                    label="Saturation"
                    min={-100}
                    max={100}
                    value={adj.saturation}
                    onChange={(v) => onUpdate(key, "saturation", v)}
                  />
                  <HslSlider
                    label="Luminance"
                    min={-100}
                    max={100}
                    value={adj.luminance}
                    onChange={(v) => onUpdate(key, "luminance", v)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HslSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const formatted = value > 0 ? `+${value}` : String(value);
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-ink-200">{label}</span>
        <span className="text-[11px] text-ink-200 tabular-nums">{formatted}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="white"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink-200 shrink-0 transition-transform"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
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
          <span className="text-[11px] text-ink-200 tabular-nums">{v}</span>
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
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-200">{control.label}</span>
        <div
          role="checkbox"
          aria-checked={v}
          tabIndex={0}
          onClick={() => onChange(!v)}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!v); } }}
          className={[
            "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0",
            v
              ? "bg-accent-500/20 border-accent-500"
              : "bg-ink-800 border-ink-300",
          ].join(" ")}
        >
          {v && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6L5 9L10 3" stroke="#E85D26" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
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

// ---------- Inline SVG icons ----------

function GripIcon() {
  return (
    <svg
      width="10"
      height="14"
      viewBox="0 0 10 14"
      fill="currentColor"
      className="text-ink-200 cursor-grab shrink-0"
      aria-hidden="true"
    >
      <circle cx="3" cy="2.5" r="1.5" />
      <circle cx="7" cy="2.5" r="1.5" />
      <circle cx="3" cy="7" r="1.5" />
      <circle cx="7" cy="7" r="1.5" />
      <circle cx="3" cy="11.5" r="1.5" />
      <circle cx="7" cy="11.5" r="1.5" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
