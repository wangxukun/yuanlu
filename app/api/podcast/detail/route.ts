import { NextRequest, NextResponse } from "next/server";
import { getPodcastDetail } from "@/lib/podcast-service";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const data = await getPodcastDetail(id);
  if (!data) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  return NextResponse.json(data);
}
