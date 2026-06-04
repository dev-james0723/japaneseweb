import { NextResponse } from "next/server";
import { culturalMotionManifest } from "@/lib/motion/culturalMotionAssets";

export function GET() {
  return NextResponse.json(culturalMotionManifest);
}
