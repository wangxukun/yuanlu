// lib/subtitleParser.ts

export interface SubtitleItem {
  index: number;
  start: number; // 开始时间 (秒)
  end: number; // 结束时间 (秒)
  text: string; // 字幕文本
}

/**
 * 将时间字符串转换为秒数
 * 支持 SRT (00:00:02,274) 和 VTT (00:00:02.274) 格式
 */
function parseTime(timeStr: string): number {
  if (!timeStr) return 0;

  const parts = timeStr.trim().split(":");
  let seconds = 0;
  let minutes = 0;
  let hours = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    // 兼容 SRT 的逗号 (,) 和 VTT 的点 (.)
    seconds = parseFloat(parts[2].replace(",", "."));
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1].replace(",", "."));
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 解析 SRT 或 WebVTT 字幕内容
 * @param content 字幕文件的纯文本内容
 */
export function parseSubtitle(content: string): SubtitleItem[] {
  if (!content) return [];

  // 1. 统一换行符，移除 BOM 头
  const normalizedContent = content
    .replace(/^\uFEFF/, "") // 移除 UTF-8 BOM
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // 2. 按空行分割成块（Block）
  // SRT 标准是用双换行符分隔每个字幕块
  const blocks = normalizedContent.split(/\n\s*\n/);

  const subtitles: SubtitleItem[] = [];

  // 时间轴正则: 匹配 00:00:00,000 --> 00:00:00,000 (支持逗号和点)
  const timeRegex =
    /(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{3})?)/;

  blocks.forEach((block) => {
    // 移除首尾空白
    const lines = block.trim().split("\n");

    // 如果是 WEBVTT 头，跳过
    if (lines[0] === "WEBVTT" || lines[0] === "") return;

    let startTime = 0;
    let endTime = 0;
    const textLines: string[] = [];
    let foundTime = false;

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].trim();

      // 尝试匹配时间轴
      const timeMatch = line.match(timeRegex);

      if (timeMatch) {
        foundTime = true;
        startTime = parseTime(timeMatch[1]);
        endTime = parseTime(timeMatch[2]);
        // 时间轴之后的所有行都是文本（直到块结束）
        // 将后续行全部加入文本数组
        for (let k = j + 1; k < lines.length; k++) {
          textLines.push(lines[k].trim());
        }
        break; // 找到时间轴和文本后，处理下一个块
      }
    }

    if (foundTime && textLines.length > 0) {
      subtitles.push({
        index: subtitles.length + 1, // 重新生成序号，保证连续
        start: startTime,
        end: endTime,
        text: textLines.join(" "), // 合并多行文本
      });
    }
  });

  return subtitles;
}
