// UI-side preset metadata: controls schema and defaults.
// Render logic lives in /public/filters.js (shared between iframe preview and
// Playwright export). IDs here must match keys in public/filters.js PRESETS.

export type PresetId =
  | "film-grain"
  | "cinematic"
  | "matte-fade"
  | "bw-contrast"
  | "soft-glow"
  | "canvas-texture"
  | "duotone"
  | "studio-lighting";

export type Control =
  | {
      kind: "slider";
      key: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      default: number;
    }
  | {
      kind: "select";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      default: string;
    }
  | { kind: "toggle"; key: string; label: string; default: boolean }
  | { kind: "color"; key: string; label: string; default: string };

export interface PresetDef {
  id: PresetId;
  name: string;
  description: string;
  controls: Control[];
}

const pct = (key: string, label: string, def: number): Control => ({
  kind: "slider",
  key,
  label,
  min: 0,
  max: 100,
  step: 1,
  default: def,
});

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
        default: "medium",
        options: [
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
      { kind: "toggle", key: "scanLines", label: "Scan Lines", default: false },
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
    ],
  },
  {
    id: "canvas-texture",
    name: "Canvas Texture",
    description: "Paper/canvas grain with rough edge.",
    controls: [
      pct("intensity", "Intensity", 55),
      {
        kind: "select",
        key: "textureScale",
        label: "Texture Scale",
        default: "medium",
        options: [
          { value: "fine", label: "Fine" },
          { value: "medium", label: "Medium" },
          { value: "coarse", label: "Coarse" },
        ],
      },
      pct("textureOpacity", "Texture Opacity", 55),
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
