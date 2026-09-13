/**
 * 剧集音频直链与字幕数据解析（模块级缓存）。
 * 与语音评测/生词本同源：/api/episode/subtitles 返回 OSS 签名直链与双语字幕，
 * 精确 seek 不走 audio-proxy。句子本各播放器（微播放器/复习卡）共享缓存。
 */

export interface EpisodeSubtitleWord {
  word: string;
  start: number; // 全集音频绝对秒
  end: number;
}

export interface EpisodeSubtitleItem {
  id: number;
  start: number;
  end?: number;
  textEn?: string;
  textCn?: string;
  speaker?: string;
  /** 词级时间戳（双语 JSON 字幕提供时存在），供评测卡原声片段精确定位 */
  words?: EpisodeSubtitleWord[];
}

export interface EpisodeSubtitlesData {
  audioUrl: string | null;
  subtitles: EpisodeSubtitleItem[];
}

const subtitlesDataCache = new Map<string, EpisodeSubtitlesData>();

/** 一次请求同时取回音频直链与完整字幕列表（含词级时间戳），按剧集缓存。 */
export async function getEpisodeSubtitlesData(
  episodeid: string,
): Promise<EpisodeSubtitlesData> {
  const cached = subtitlesDataCache.get(episodeid);
  if (cached) return cached;

  const res = await fetch(`/api/episode/subtitles?id=${episodeid}`);
  const json = await res.json();
  const data: EpisodeSubtitlesData = {
    audioUrl: json?.audioUrl ?? null,
    subtitles: Array.isArray(json?.data) ? (json.data as EpisodeSubtitleItem[]) : [],
  };
  subtitlesDataCache.set(episodeid, data);
  return data;
}

export async function getEpisodeAudioUrl(
  episodeid: string,
): Promise<string | null> {
  // 复用同一份接口缓存，避免与 getEpisodeSubtitlesData 重复请求
  const { audioUrl } = await getEpisodeSubtitlesData(episodeid);
  return audioUrl;
}
