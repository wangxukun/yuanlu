import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { DictEntryDTO } from "./dto";

/**
 * System prompt for the DeepSeek dictionary LLM.
 * Derived from /public/字典.md — kept as a raw string to avoid filesystem I/O at runtime.
 */
export const SYSTEM_PROMPT = `You are an authoritative, accurate, and comprehensive English-Chinese dictionary API engine. Your task is to analyze the target English word or phrase provided by the user and output a detailed dictionary entry strictly formatted as a valid JSON object.

### Instructions:

1. **Format Constraint**: You must output ONLY a raw, valid JSON string. Do NOT include markdown code blocks (such as \`\`\`json ... \`\`\`), preamble, or postscript text.
2. **JSON Keyword**: The output must adhere strictly to JSON formatting rules.
3. **Phonetics**: Provide precise IPA (International Phonetic Alphabet) representations for BOTH US and UK pronunciations in \`phonetics.us\` and \`phonetics.uk\`.
4. **Audio URLs**: Construct the pronunciation audio URLs strictly using the following deterministic format rules (convert the target word/phrase to lowercase and url-encode if containing spaces):
   - US Audio URL (\`audio_urls.us\`): \`https://dict.youdao.com/dictvoice?audio=<target_word>&type=2\`
   - UK Audio URL (\`audio_urls.uk\`): \`https://dict.youdao.com/dictvoice?audio=<target_word>&type=1\`
5. **Etymology & Memory**: Break down the word root, prefix, and suffix in detail, and provide a helpful mnemonic (助记/记忆法).
6. **Definitions**: Group definitions by part of speech (词性). Include precise short Chinese translations (meaning_cn), detailed Chinese explanations (meaning_en), and CEFR language level (if applicable).
7. **Examples**: Provide 2-3 natural, high-quality example sentences containing English, Chinese translation, and usage context.
8. **Robustness**: If the input is slang, a phrase, or misspelled, handle it gracefully by correcting or explaining accordingly.

### Target JSON Schema Definition:

{
  "word": "string (the target word or phrase)",
  "phonetics": {
    "us": "string (IPA for US English, e.g., /ˈskedʒuːl/)",
    "uk": "string (IPA for UK English, e.g., /ˈʃedjuːl/)"
  },
  "audio_urls": {
    "us": "string (US audio link: https://dict.youdao.com/dictvoice?audio=<target_word>&type=2)",
    "uk": "string (UK audio link: https://dict.youdao.com/dictvoice?audio=<target_word>&type=1)"
  },
  "inflections": {
    "plural": "string or null",
    "past_tense": "string or null",
    "present_participle": "string or null",
    "third_person_singular": "string or null",
    "adjective_form": "string or null"
  },
  "definitions": [
    {
      "pos": "string (part of speech, e.g., 'n.', 'v.', 'adj.')",
      "meaning_cn": "string (Short Chinese translation)",
      "meaning_en": "string (Detailed explanation in Chinese, please provide the detailed explanation in Chinese here despite the key name)",
      "cefr_level": "string (e.g., 'B2', 'C1', or null)"
    }
  ],
  "etymology": {
    "prefix": "string or null (e.g., 're- (again, back)')",
    "root": "string or null (e.g., '-sili- / salire (to leap)')",
    "suffix": "string or null (e.g., '-ence (noun suffix)')",
    "breakdown": "string (etymological origin and history)",
    "mnemonic": "string (memory tip / association method)"
  },
  "phrases_and_collocations": [
    {
      "phrase": "string",
      "meaning_cn": "string"
    }
  ],
  "synonyms": ["string"],
  "antonyms": ["string"],
  "examples": [
    {
      "en": "string (English example sentence)",
      "cn": "string (Chinese translation)",
      "context": "string (e.g., 'General', 'Academic', 'Business')"
    }
  ]
}`;

/**
 * Call the DeepSeek LLM to generate a dictionary entry.
 * Uses the OpenAI-compatible chat completions endpoint.
 */
async function callDeepSeekLLM(word: string): Promise<DictEntryDTO> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-chat";

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
      temperature: 0.1, // Low temperature for deterministic dictionary output
      max_tokens: 4096,
      // reasoning_effort: "low", // 降低推理开销，提高速度
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Debug: log the raw response structure
  console.log(
    "[DeepSeek] Raw response:",
    JSON.stringify({
      id: result.id,
      model: result.model,
      choices_length: result.choices?.length,
      finish_reason: result.choices?.[0]?.finish_reason,
      has_content: !!result.choices?.[0]?.message?.content,
      has_reasoning: !!result.choices?.[0]?.message?.reasoning_content,
      error: result.error,
    }),
  );

  const message = result.choices?.[0]?.message;
  // Use message.content for the final answer. We DO NOT fallback to reasoning_content
  // because reasoning_content contains chain-of-thought text which is not valid JSON.
  const content: string = (message?.content || "").trim();

  if (!content) {
    throw new Error(
      `DeepSeek returned empty content. This usually means the model was cut off during reasoning. finish_reason: ${result.choices?.[0]?.finish_reason}`,
    );
  }

  // 提取 JSON 对象，防止 LLM 包裹多余文本或 Markdown 标记
  const startIndex = content.indexOf("{");
  const endIndex = content.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("No valid JSON object found in LLM response");
  }

  const jsonStr = content.substring(startIndex, endIndex + 1);
  let parsed: DictEntryDTO;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    console.error("[DeepSeek] JSON parse error on string:", jsonStr);
    throw new Error(
      `Failed to parse LLM JSON response: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return parsed;
}

export const dictionaryService = {
  /**
   * Look up a word using the 3-tier strategy:
   * 1. PostgreSQL cache (fastest server-side)
   * 2. DeepSeek LLM generation → persist to DB
   *
   * The HTTP/browser cache layer is handled by the API route's Cache-Control headers.
   *
   * @returns { data: DictEntryDTO, source: "db" | "llm" }
   */
  async lookup(
    word: string,
  ): Promise<{ data: DictEntryDTO; source: "db" | "llm" }> {
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord) {
      throw new Error("Word cannot be empty");
    }

    // Tier 2: PostgreSQL cache
    const cached = await prisma.dictionary.findUnique({
      where: { word: normalizedWord },
    });

    if (cached) {
      return { data: cached.data as unknown as DictEntryDTO, source: "db" };
    }

    // Tier 3: LLM generation
    const dictEntry = await callDeepSeekLLM(normalizedWord);

    // Persist to PostgreSQL for future lookups
    await prisma.dictionary.create({
      data: {
        word: normalizedWord,
        data: dictEntry as unknown as Prisma.InputJsonValue,
      },
    });

    return { data: dictEntry, source: "llm" };
  },
};
