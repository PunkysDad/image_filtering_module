// UI-side preset metadata: controls schema and defaults.
// Render logic lives in /public/filters.js (shared between iframe preview and
// Playwright export). IDs here must match keys in public/filters.js PRESETS.

export type PresetId =
  | "film-grain"
  | "cinematic"
  | "matte-fade"
  | "bw-contrast"
  | "soft-glow"
  | "duotone"
  | "studio-lighting"
  | "lut-kodak-2383"
  | "lut-bleach-bypass"
  | "split-tone-pro"
  | "lut-fuji-3510"
  | "lut-cool-fade"
  | "lut-warm-print"
  | "focal-blur";

export type Control =
  | {
      kind: "slider";
      key: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      default: number;
      pro?: boolean;
    }
  | {
      kind: "select";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      default: string;
      pro?: boolean;
    }
  | {
      kind: "toggle";
      key: string;
      label: string;
      default: boolean;
      pro?: boolean;
    }
  | {
      kind: "color";
      key: string;
      label: string;
      default: string;
      pro?: boolean;
    };

export interface PresetDef {
  id: PresetId;
  name: string;
  description: string;
  controls: Control[];
  // Rendering path: "canvas" (SVG + Canvas 2D, default), "lut" (WebGL LUT), or
  // "webgl" (raw source + a custom WebGL effect pass, e.g. Focal Blur).
  type?: "canvas" | "lut" | "webgl";
  // True if the preset uses the WebGL layer (LUT presets or canvas presets
  // that need GPU post).
  webgl?: boolean;
  // Visual-only badge marker. LUT presets are marked pro.
  pro?: boolean;
}

const pct = (
  key: string,
  label: string,
  def: number,
  opts: { pro?: boolean } = {},
): Control => ({
  kind: "slider",
  key,
  label,
  min: 0,
  max: 100,
  step: 1,
  default: def,
  ...(opts.pro ? { pro: true } : {}),
});

// Optional WebGL-enhancement controls added to existing Canvas 2D presets.
// All marked pro:true so they appear under the PRO ENHANCEMENTS divider.
const LENS_ABERRATION_SLIDER: Control = {
  kind: "slider",
  key: "lensAberration",
  label: "Lens Aberration",
  min: 0,
  max: 100,
  step: 1,
  default: 0,
  pro: true,
};
// Standard controls shared by every LUT preset.
const lutControls = (intensityDefault = 85): Control[] => [
  pct("intensity", "Intensity", intensityDefault),
  pct("grain", "Grain", 20),
  pct("aberration", "Lens Aberration", 0),
];

export const PRESETS: PresetDef[] = [
  {
    id: "film-grain",
    name: "Film Grain",
    description: "Analog texture with vignetting.",
    controls: [
      pct("intensity", "Intensity", 70),
      {
        kind: "select",
        key: "grainSize",
        label: "Grain Size",
        default: "none",
        options: [
          { value: "none", label: "None" },
          { value: "fine", label: "Fine" },
          { value: "medium", label: "Medium" },
          { value: "coarse", label: "Coarse" },
        ],
      },
      pct("vignetteStrength", "Vignette", 40),
    ],
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Teal-orange grade with bloom.",
    controls: [
      pct("intensity", "Intensity", 70),
      pct("tealOrangeStrength", "Teal/Orange", 65),
      { kind: "toggle", key: "letterbox", label: "Letterbox", default: false },
      pct("bloomAmount", "Bloom", 35),
      LENS_ABERRATION_SLIDER,
    ],
  },
  {
    id: "matte-fade",
    name: "Matte Fade",
    description: "Lifted blacks, soft cool shift.",
    controls: [
      pct("intensity", "Intensity", 70),
      pct("fadeAmount", "Fade", 55),
      pct("coolShift", "Cool Shift", 40),
    ],
  },
  {
    id: "bw-contrast",
    name: "High Contrast B&W",
    description: "Deep blacks, strong contrast.",
    controls: [
      pct("intensity", "Intensity", 85),
      pct("contrast", "Contrast", 70),
      pct("grainAmount", "Grain", 50),
      {
        kind: "select",
        key: "channelMix",
        label: "Channel Filter",
        default: "neutral",
        options: [
          { value: "neutral", label: "Neutral" },
          { value: "redFilter", label: "Red Filter" },
          { value: "greenFilter", label: "Green Filter" },
          { value: "blueFilter", label: "Blue Filter" },
        ],
      },
      {
        kind: "color",
        key: "shadowTone",
        label: "Shadow Tone",
        default: "#1a1a26",
      },
      {
        kind: "color",
        key: "highlightTone",
        label: "Highlight Tone",
        default: "#f5ecd9",
      },
    ],
  },
  {
    id: "soft-glow",
    name: "Soft Glow",
    description: "Warm bloom over highlights.",
    controls: [
      pct("intensity", "Intensity", 70),
      pct("glowRadius", "Glow Radius", 60),
      pct("warmth", "Warmth", 50),
      pct("bloomThreshold", "Bloom Threshold", 55),
      LENS_ABERRATION_SLIDER,
    ],
  },
  {
    id: "duotone",
    name: "Duotone",
    description: "Shadow-to-highlight color ramp.",
    controls: [
      pct("intensity", "Intensity", 90),
      {
        kind: "color",
        key: "shadowColor",
        label: "Shadow Color",
        default: "#1a2a6c",
      },
      {
        kind: "color",
        key: "highlightColor",
        label: "Highlight Color",
        default: "#ffcc66",
      },
    ],
  },
  {
    id: "studio-lighting",
    name: "Studio Lighting",
    description: "Directional soft spotlight.",
    controls: [
      pct("intensity", "Intensity", 70),
      pct("lightX", "Light X", 50),
      pct("lightY", "Light Y", 40),
      pct("lightRadius", "Light Radius", 55),
      pct("lightIntensity", "Light Power", 55),
    ],
  },

  // ---- LUT PRO presets (WebGL) ----
  {
    id: "lut-kodak-2383",
    name: "Kodak 2383",
    description: "Classic print film warmth.",
    type: "lut",
    webgl: true,
    pro: true,
    controls: lutControls(85),
  },
  {
    id: "lut-bleach-bypass",
    name: "Bleach Bypass",
    description: "Desaturated, high-contrast.",
    type: "lut",
    webgl: true,
    pro: true,
    controls: lutControls(80),
  },
  {
    id: "split-tone-pro",
    name: "Split Tone Pro",
    description: "Hue-aware shadow/highlight grade.",
    type: "lut",
    webgl: true,
    pro: true,
    controls: [
      {
        kind: "select",
        key: "pair",
        label: "Color Pair",
        default: "teal-orange",
        options: [
          { value: "teal-orange",   label: "Teal / Orange"   },
          { value: "blue-gold",     label: "Blue / Gold"     },
          { value: "green-magenta", label: "Green / Magenta" },
          { value: "cyan-red",      label: "Cyan / Red"      },
          { value: "purple-yellow", label: "Purple / Yellow" },
        ],
      },
      pct("strength", "Split Strength", 50),
      ...lutControls(80),
    ],
  },
  {
    id: "lut-fuji-3510",
    name: "Fuji 3510",
    description: "Cool greens, soft roll-off.",
    type: "lut",
    webgl: true,
    pro: true,
    controls: lutControls(85),
  },
  {
    id: "lut-cool-fade",
    name: "Cool Fade",
    description: "Matte editorial, cool cast.",
    type: "lut",
    webgl: true,
    pro: true,
    controls: lutControls(75),
  },
  {
    id: "lut-warm-print",
    name: "Warm Print",
    description: "Rich warm mids and lift.",
    type: "lut",
    webgl: true,
    pro: true,
    controls: lutControls(85),
  },

  // ---- Focal Blur (WebGL) ----
  // Zoom/radial motion blur radiating from a user-defined focal region. The
  // focal point and radius come from the bounding box drawn on the preview
  // panel, not from sliders — so the only control is Intensity.
  {
    id: "focal-blur",
    name: "Focal Blur",
    description: "Zoom blur radiating from a focal region.",
    type: "webgl",
    webgl: true,
    pro: true,
    controls: [pct("intensity", "Intensity", 50)],
  },
];

export const PRESETS_BY_ID: Record<PresetId, PresetDef> = PRESETS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PresetId, PresetDef>,
);

export function defaultParams(preset: PresetDef): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of preset.controls) out[c.key] = c.default;
  return out;
}
