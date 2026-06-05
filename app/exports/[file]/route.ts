import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORTS_DIR = path.join(process.cwd(), "exports");

export async function GET(
  _req: NextRequest,
  { params }: { params: { file: string } },
) {
  const safe = path.basename(params.file);
  if (safe !== params.file) return new Response("Bad path", { status: 400 });
  const ext = path.extname(safe).toLowerCase();
  const contentTypeByExt: Record<string, string> = {
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  };
  const contentType = contentTypeByExt[ext];
  if (!contentType) {
    return new Response("Unsupported type", { status: 415 });
  }
  const full = path.join(EXPORTS_DIR, safe);
  try {
    const data = await fs.readFile(full);
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safe}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
