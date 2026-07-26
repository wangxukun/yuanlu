/**
 * 难度等级 → 远路色板 映射（唯一来源，勿在组件内重复定义）
 * A*  入门 → primary（远青）
 * B1  中级 → info（黛蓝）
 * B2  高级 → accent（曙光橙）
 * C*  专家 → error（陶土红）
 */
export function difficultyTextColor(level?: string | null): string {
  if (!level) return "text-ink-700";
  if (level.includes("A")) return "text-primary-600";
  if (level.includes("B1")) return "text-info-600";
  if (level.includes("B2")) return "text-accent-600";
  if (level.includes("C")) return "text-error-600";
  return "text-ink-700";
}

/** 圆点底色（用于 meta 行 "● 难度" 形式） */
export function difficultyDotColor(level?: string | null): string {
  if (!level) return "bg-ink-300";
  if (level.includes("A")) return "bg-primary-500";
  if (level.includes("B1")) return "bg-info-500";
  if (level.includes("B2")) return "bg-accent-500";
  if (level.includes("C")) return "bg-error-500";
  return "bg-ink-300";
}
