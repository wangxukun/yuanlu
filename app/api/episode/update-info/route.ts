/**
 * 更新剧集基本信息
 */
import { NextResponse } from "next/server";
import { episodeService } from "@/core/episode/episode.service";
import { Prisma } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const {
      title,
      description,
      isExclusive,
      publishAt,
      status,
      podcastid,
      tags,
    } = await req.json();
    const data: Prisma.episodeUpdateInput = {
      title,
      description,
      isExclusive,
      publishAt: new Date(publishAt),
      status: status,
      podcast: {
        connect: {
          podcastid: podcastid,
        },
      },
      tags: {
        deleteMany: {}, // 删除所有关联的标签
        // 创建新的关联
        create: tags.map((tagId: string) => ({
          tag: {
            connect: {
              tagid: tagId,
            },
          },
        })),
      },
    };
    // body 的类型必须匹配 Prisma.episodeUpdateInput
    const resolvedParams = await params;
    const updated = await episodeService.update(resolvedParams.id, data);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("更新剧集时出错:", err);
    return NextResponse.json({
      success: false,
      message: "服务器错误",
      status: 500,
    });
  }
}
