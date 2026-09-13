/**
 * 生词本词汇 × 收藏句子的真实交集（"联动词汇"语义）。
 * 数据库无 sentence↔vocabulary 关联表，联动关系由运行时词边界匹配派生，
 * 与 VocabularyHighlighter 的匹配语义保持一致：\b 词边界、忽略大小写、trim。
 */

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 过滤出实际出现在任意收藏句子英文原文中的生词本词汇。
 * 按小写词形去重（vocabulary 表对 word 无唯一约束），保证统计口径准确。
 */
export function filterLinkedVocabWords<T extends { word: string }>(
  vocabWords: T[],
  sentences: { enText: string }[],
): T[] {
  if (vocabWords.length === 0 || sentences.length === 0) return [];

  const regexCache = new Map<string, RegExp>();
  const seen = new Set<string>();

  return vocabWords.filter((v) => {
    const word = v.word.trim();
    if (!word) return false;

    const key = word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);

    let re = regexCache.get(key);
    if (!re) {
      re = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
      regexCache.set(key, re);
    }
    return sentences.some((s) => re.test(s.enText));
  });
}
