import { NextRequest, NextResponse } from "next/server";
import { renderToWebp, LayerDef } from "@/lib/renderer";
import { PRESETS_BY_ID, PresetId } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function originFromRequest(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

interface LayerBody {
  preset: string;
  visible?: boolean;
  intensity?: number;
  params?: Record<string, unknown>;
}

interface ExportBody {
  imagePath?: string;
  layers?: LayerBody[];
  seed?: number;
  overlayImagePath?: string | null;
  overlayPreset?: string | null;
  overlayParams?: Record<string, unknown> | null;
  knockoutText?: string | null;
  textSize?: number;
  textPosition?: { x: number; y: number };
  letterSpacing?: number;
  fontWeight?: number;
  hslAdjustments?: Record<string, { hue: number; saturation: number; luminance: number }> | null;
}

export async function POST(req: NextRequest) {
  let body: ExportBody;
  try {
    body = (await req.json()) as ExportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    imagePath,
    layers,
    seed,
    overlayImagePath,
    overlayPreset,
    overlayParams,
    knockoutText,
    textSize,
    textPosition,
    letterSpacing,
    fontWeight,
    hslAdjustments,
  } = body;

  if (!imagePath || typeof imagePath !== "string") {
    return NextResponse.json(
      { error: "imagePath is required" },
      { status: 400 },
    );
  }
  if (!imagePath.startsWith("/uploads/")) {
    return NextResponse.json(
      { error: "imagePath must be under /uploads/" },
      { status: 400 },
    );
  }

  if (!Array.isArray(layers) || layers.length === 0) {
    return NextResponse.json(
      { error: "layers array is required and must not be empty" },
      { status: 400 },
    );
  }
  for (const layer of layers) {
    if (!layer.preset || !(layer.preset in PRESETS_BY_ID)) {
      return NextResponse.json(
        { error: `Unknown preset: ${layer.preset}` },
        { status: 400 },
      );
    }
  }

  if (overlayImagePath) {
    if (
      typeof overlayImagePath !== "string" ||
      !overlayImagePath.startsWith("/uploads/")
    ) {
      return NextResponse.json(
        { error: "overlayImagePath must be under /uploads/" },
        { status: 400 },
      );
    }
    if (!overlayPreset || !(overlayPreset in PRESETS_BY_ID)) {
      return NextResponse.json(
        { error: `Unknown overlayPreset: ${overlayPreset}` },
        { status: 400 },
      );
    }
  }

  const normalizedLayers: LayerDef[] = layers.map((l) => ({
    preset: l.preset,
    visible: l.visible !== false,
    intensity: typeof l.intensity === "number" ? l.intensity : 100,
    params: l.params ?? {},
  }));

  try {
    const result = await renderToWebp({
      imagePath,
      layers: normalizedLayers,
      seed: typeof seed === "number" ? seed : 1,
      origin: originFromRequest(req),
      overlayImagePath: overlayImagePath ?? null,
      overlayPreset: (overlayPreset ?? null) as PresetId | null,
      overlayParams: overlayParams ?? null,
      knockoutText: knockoutText ?? null,
      textSize: typeof textSize === "number" ? textSize : 15,
      textPosition: textPosition ?? { x: 50, y: 50 },
      letterSpacing: typeof letterSpacing === "number" ? letterSpacing : 0,
      fontWeight: typeof fontWeight === "number" ? fontWeight : 900,
      hslAdjustments: hslAdjustments ?? null,
    });
    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
