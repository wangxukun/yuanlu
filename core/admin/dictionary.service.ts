import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SYSTEM_PROMPT } from "@/core/dictionary/dictionary.service";
import type { DictEntryDTO } from "@/core/dictionary/dto";

export const adminDictionaryService = {
  async getDictionaryList(
    page: number,
    pageSize: number,
    keyword: string = "",
  ) {
    const where: Prisma.DictionaryWhereInput = keyword
      ? { word: { contains: keyword, mode: "insensitive" } }
      : {};

    const total = await prisma.dictionary.count({ where });
    const list = await prisma.dictionary.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const words = list.map((item) => item.word);

    // Fetch favorite counts
    const favoriteCounts = await prisma.vocabulary.groupBy({
      by: ["word"],
      where: { word: { in: words } },
      _count: { word: true },
    });

    const countMap = new Map(
      favoriteCounts.map((f) => [f.word, f._count.word]),
    );

    const data = list.map((item) => ({
      ...item,
      favoriteCount: countMap.get(item.word) || 0,
    }));

    return { total, data };
  },

  async regenerateWord(word: string): Promise<DictEntryDTO> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    // Use the admin specific model, fallback to deepseek-v4-flash
    const modelName = process.env.DEEPSEEK_ADMIN_MODEL || "deepseek-v4-flash";

    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: word },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message;
    const content: string = (message?.content || "").trim();

    if (!content) {
      throw new Error("DeepSeek returned empty content.");
    }

    const startIndex = content.indexOf("{");
    const endIndex = content.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No valid JSON object found in LLM response");
    }

    const jsonStr = content.substring(startIndex, endIndex + 1);
    let parsed: DictEntryDTO;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse LLM JSON response");
    }
    return parsed;
  },

  async updateDictionary(word: string, data: DictEntryDTO) {
    const updated = await prisma.dictionary.update({
      where: { word },
      data: { data: data as unknown as Prisma.InputJsonValue },
    });
    return updated;
  },

  async deleteDictionary(id: string, word: string) {
    const favoriteCount = await prisma.vocabulary.count({
      where: { word },
    });

    if (favoriteCount > 0) {
      throw new Error(`无法删除：该单词已被收藏 ${favoriteCount} 次。`);
    }

    await prisma.dictionary.delete({
      where: { id },
    });
    return true;
  },
};
