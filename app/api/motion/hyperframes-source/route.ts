import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const filePath = path.join(process.cwd(), "hyperframes", "cultural-recap", "index.html");
  const html = await readFile(filePath, "utf8");
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": 'attachment; filename="hyperframes-cultural-recap.html"',
    },
  });
}
