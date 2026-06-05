import Anthropic from "@anthropic-ai/sdk";
import { TUTOR_SYSTEM_PROMPT } from "@/lib/ai-tutor-prompt";
import { PRESETS_BY_ID } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------- Types mirroring app/page.tsx (kept local to avoid importing a "use client" module) ----------

type Params = Record<string, string | number | boolean>;

type MaskChannelSettings = { expansion: number; smoothness: number; invert: boolean };

type LayerMask = {
  luminosity: { enabled: boolean; min: number; max: number; smoothness: number; invert: boolean };
  colorRange: {
    enabled: boolean;
    activeChannels: string[];       // serialized from MaskChannel[]
    focusedChannel: string | null;  // UI-only, not used in context generation
    channels?: Record<string, MaskChannelSettings>;
  };
};

type CurvePoint = [number, number];
type Curve = CurvePoint[];

type LayerCurves = { rgb: Curve; r: Curve; g: Curve; b: Curve };

type Layer = {
  id: string;
  preset: string;
  params: Params;
  visible: boolean;
  intensity: number;
  mask: LayerMask;
  curves: LayerCurves;
};

type HslChannel = { hue: number; saturation: number; luminance: number };
type HslState = {
  reds: HslChannel; oranges: HslChannel; yellows: HslChannel;
  greens: HslChannel; cyans: HslChannel; blues: HslChannel; magentas: HslChannel;
};

type Message = { role: "user" | "assistant"; content: string };

type RequestBody = {
  messages: Message[];
  layers: Layer[];
  hslAdjustments: HslState;
};

// ---------- Layer context formatter ----------

const HSL_KEYS = ["reds", "oranges", "yellows", "greens", "cyans", "blues", "magentas"] as const;

function isIdentityCurve(curve: Curve): boolean {
  return (
    curve.length === 2 &&
    curve[0][0] === 0 && curve[0][1] === 0 &&
    curve[1][0] === 255 && curve[1][1] === 255
  );
}

function buildLayerContext(layers: Layer[], hslAdjustments: HslState): string {
  const lines: string[] = ["Current layer stack (top to bottom):"];

  if (layers.length === 0) {
    lines.push("No layers are currently active.");
  } else {
    layers.forEach((layer, i) => {
      const presetDef = PRESETS_BY_ID[layer.preset as keyof typeof PRESETS_BY_ID];
      const presetName = presetDef?.name ?? layer.preset;

      const parts: string[] = [`${i + 1}. ${presetName} — Intensity: ${layer.intensity}.`];

      // Non-default control values
      if (presetDef) {
        const nonDefault: string[] = [];
        for (const control of presetDef.controls) {
          const value = layer.params[control.key];
          if (value === undefined || value === control.default) continue;
          if (control.kind === "slider") {
            nonDefault.push(`${control.label}: ${value}`);
          } else if (control.kind === "select") {
            const opt = control.options.find((o) => o.value === value);
            nonDefault.push(`${control.label}: ${opt?.label ?? value}`);
          } else if (control.kind === "toggle") {
            nonDefault.push(`${control.label}: ${value ? "on" : "off"}`);
          } else if (control.kind === "color") {
            nonDefault.push(`${control.label}: ${value}`);
          }
        }
        if (nonDefault.length > 0) parts.push(nonDefault.join(", ") + ".");
      }

      // Active masks
      const maskParts: string[] = [];
      if (layer.mask.luminosity.enabled) {
        const lum = layer.mask.luminosity;
        maskParts.push(
          `luminosity mask (range ${lum.min}–${lum.max}${lum.invert ? ", inverted" : ""})`
        );
      }
      if (layer.mask.colorRange.enabled && layer.mask.colorRange.activeChannels?.length > 0) {
        const cr = layer.mask.colorRange;
        const chDescs = (cr.activeChannels ?? []).map((key) => {
          const cs: MaskChannelSettings =
            (cr.channels && cr.channels[key]) || { expansion: 50, smoothness: 50, invert: false };
          return `${key} (expansion: ${cs.expansion}, smoothness: ${cs.smoothness}${cs.invert ? ", inverted" : ""})`;
        });
        maskParts.push(`color range mask: ${chDescs.join("; ")}`);
      }
      if (maskParts.length > 0) {
        parts.push(`Mask active: ${maskParts.join(" + ")}.`);
      }

      // Adjusted curves
      const curvesActive =
        !isIdentityCurve(layer.curves.rgb) ||
        !isIdentityCurve(layer.curves.r) ||
        !isIdentityCurve(layer.curves.g) ||
        !isIdentityCurve(layer.curves.b);
      if (curvesActive) {
        parts.push("Curves are active on this layer.");
      }

      lines.push(parts.join(" "));
    });
  }

  // Global HSL
  const activeHsl: string[] = [];
  for (const key of HSL_KEYS) {
    const ch = hslAdjustments[key];
    if (ch.hue === 0 && ch.saturation === 0 && ch.luminance === 0) continue;
    const vals: string[] = [];
    if (ch.hue !== 0) vals.push(`Hue: ${ch.hue > 0 ? "+" : ""}${ch.hue}`);
    if (ch.saturation !== 0) vals.push(`Saturation: ${ch.saturation > 0 ? "+" : ""}${ch.saturation}`);
    if (ch.luminance !== 0) vals.push(`Luminance: ${ch.luminance > 0 ? "+" : ""}${ch.luminance}`);
    activeHsl.push(`${key} (${vals.join(", ")})`);
  }

  lines.push(
    activeHsl.length === 0
      ? "Global HSL: No HSL adjustments active."
      : `Global HSL: ${activeHsl.join("; ")}.`
  );

  return lines.join("\n");
}

// ---------- Route handler ----------

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { messages, layers, hslAdjustments } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages is required" }), { status: 400 });
    }

    // Append layer context to the last user message server-side.
    const context = buildLayerContext(layers ?? [], hslAdjustments ?? {
      reds: { hue: 0, saturation: 0, luminance: 0 },
      oranges: { hue: 0, saturation: 0, luminance: 0 },
      yellows: { hue: 0, saturation: 0, luminance: 0 },
      greens: { hue: 0, saturation: 0, luminance: 0 },
      cyans: { hue: 0, saturation: 0, luminance: 0 },
      blues: { hue: 0, saturation: 0, luminance: 0 },
      magentas: { hue: 0, saturation: 0, luminance: 0 },
    });

    const augmented: Message[] = messages.map((msg, idx) =>
      idx === messages.length - 1 && msg.role === "user"
        ? { ...msg, content: `${msg.content}\n\n${context}` }
        : msg
    );

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (data: string) =>
          controller.enqueue(enc.encode(`data: ${data}\n\n`));

        try {
          const anthropicStream = client.messages.stream({
            model: "claude-haiku-4-5-20251001",
            system: TUTOR_SYSTEM_PROMPT,
            messages: augmented,
            max_tokens: 1024,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send(JSON.stringify({ text: event.delta.text }));
            }
          }

          send("[DONE]");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          send(JSON.stringify({ error: msg }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
