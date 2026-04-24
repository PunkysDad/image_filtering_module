import { NextRequest, NextResponse } from "next/server";
import { renderToWebp } from "@/lib/renderer";
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

interface ExportBody {
  imagePath?: string;
  preset?: string;
  params?: Record<string, unknown>;
  seed?: number;
  overlayImagePath?: string | null;
  overlayPreset?: string | null;
  overlayParams?: Record<string, unknown> | null;
  knockoutText?: string | null;
  textSize?: number;
  textPosition?: { x: number; y: number };
  letterSpacing?: number;
  fontWeight?: number;
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
    preset,
    params,
    seed,
    overlayImagePath,
    overlayPreset,
    overlayParams,
    knockoutText,
    textSize,
    textPosition,
    letterSpacing,
    fontWeight,
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
  if (!preset || !(preset in PRESETS_BY_ID)) {
    return NextResponse.json(
      { error: `Unknown preset: ${preset}` },
      { status: 400 },
    );
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

  try {
    const result = await renderToWebp({
      imagePath,
      preset: preset as PresetId,
      params: params ?? {},
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
