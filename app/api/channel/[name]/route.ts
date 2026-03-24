import { NextRequest, NextResponse } from "next/server";
import { getChannelData } from "@/core/channel/channel.service";

/**
 * GET /api/channel/[name]
 * Public API for retrieving channel data by platform name.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    if (!decodedName) {
      return NextResponse.json(
        { success: false, error: "Missing channel name" },
        { status: 400 },
      );
    }

    const data = await getChannelData(decodedName);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to fetch channel data:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
