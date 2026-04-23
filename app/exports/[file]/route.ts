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
  if (path.extname(safe).toLowerCase() !== ".webp") {
    return new Response("Unsupported type", { status: 415 });
  }
  const full = path.join(EXPORTS_DIR, safe);
  try {
    const data = await fs.readFile(full);
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `attachment; filename="${safe}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
