import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  try {
    const tags = await prisma.tag.findMany({
      where: query
        ? {
            name: {
              contains: query,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : undefined,
      take: 20, // 限制返回数量
      orderBy: {
        name: Prisma.SortOrder.asc,
      },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Fetch tags failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
