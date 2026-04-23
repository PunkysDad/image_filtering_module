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

export async function POST(req: NextRequest) {
  let body: {
    imagePath?: string;
    preset?: string;
    params?: Record<string, unknown>;
    seed?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imagePath, preset, params, seed } = body;
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

  try {
    const result = await renderToWebp({
      imagePath,
      preset: preset as PresetId,
      params: params ?? {},
      seed: typeof seed === "number" ? seed : 1,
      origin: originFromRequest(req),
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
