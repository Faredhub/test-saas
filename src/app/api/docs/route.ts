import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/swagger";

export function GET() {
  return NextResponse.json(openApiSpec);
}
