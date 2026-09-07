import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/guard";
import { learningPathService } from "@/core/learning-path/learning-path.service";
import { CreateLearningPathSchema } from "@/core/learning-path/dto";

type RouteContext = { params: Promise<{ pathid: string }> };

/** 路径 id 解析：非正整数直接 400（pathid 是自增主键） */
function parsePathid(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * 服务层错误的统一归类（对齐 Android ContentRepositoryImpl 的语义映射）：
 * “无权访问/无权操作” → 403；其余未预期错误 → 500。
 */
function errorResponse(error: unknown, fallback: string): NextResponse {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("无权")) {
    return NextResponse.json(
      { success: false, message: "无权操作该路径" },
      { status: 403 },
    );
  }
  console.error(fallback, error);
  return NextResponse.json(
    { success: false, message: "服务器错误" },
    { status: 500 },
  );
}

// 路径详情（移动端详情页）：剧集清单 + 签名封面/音频 + 创建者 + 当前用户收听态。
// 私有路径非拥有者 → 403（getById 抛“无权访问”）；不存在 → 404。
export async function GET(_request: NextRequest, props: RouteContext) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const pathid = parsePathid((await props.params).pathid);
  if (pathid === null) {
    return NextResponse.json(
      { success: false, message: "路径 id 无效" },
      { status: 400 },
    );
  }

  try {
    const detail = await learningPathService.getMobileDetail(
      pathid,
      guard.session.user.userid,
    );
    if (!detail) {
      return NextResponse.json(
        { success: false, message: "路径不存在或已被删除" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    return errorResponse(error, "Error fetching learning path detail:");
  }
}

// 编辑路径元数据（仅拥有者）：名称/描述/公开状态。
export async function PATCH(request: NextRequest, props: RouteContext) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const pathid = parsePathid((await props.params).pathid);
  if (pathid === null) {
    return NextResponse.json(
      { success: false, message: "路径 id 无效" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = CreateLearningPathSchema.safeParse({
      pathName: body?.pathName,
      description: body?.description ?? undefined,
      isPublic: body?.isPublic,
    });
    if (!parsed.success) {
      const message =
        parsed.error.flatten().fieldErrors.pathName?.[0] ?? "输入无效";
      return NextResponse.json({ success: false, message }, { status: 400 });
    }

    await learningPathService.update(pathid, guard.session.user.userid, {
      pathName: parsed.data.pathName,
      // description 为 null/undefined 时传 undefined：与 Web updateLearningPathAction 同口径
      description: parsed.data.description ?? undefined,
      isPublic: parsed.data.isPublic,
    });
    return NextResponse.json({ success: true, message: "已保存" });
  } catch (error) {
    return errorResponse(error, "Error updating learning path:");
  }
}

// 删除路径（仅拥有者）：items 由外键 onDelete: Cascade 级联清除。
export async function DELETE(_request: NextRequest, props: RouteContext) {
  const guard = await requireAuth();
  if (!guard.ok) {
    return guard.response;
  }

  const pathid = parsePathid((await props.params).pathid);
  if (pathid === null) {
    return NextResponse.json(
      { success: false, message: "路径 id 无效" },
      { status: 400 },
    );
  }

  try {
    await learningPathService.delete(pathid, guard.session.user.userid);
    return NextResponse.json({ success: true, message: "已删除" });
  } catch (error) {
    return errorResponse(error, "Error deleting learning path:");
  }
}
