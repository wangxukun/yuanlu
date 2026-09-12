/**
 * 剧集音频直链解析（模块级缓存）。
 * 与语音评测/生词本同源：/api/episode/subtitles 返回 OSS 签名直链，
 * 精确 seek 不走 audio-proxy。句子本各播放器（微播放器/复习卡）共享缓存。
 */

const audioUrlCache = new Map<string, string | null>();

export async function getEpisodeAudioUrl(
  episodeid: string,
): Promise<string | null> {
  if (audioUrlCache.has(episodeid)) {
    return audioUrlCache.get(episodeid) ?? null;
  }
  const res = await fetch(`/api/episode/subtitles?id=${episodeid}`);
  const json = await res.json();
  const url = json?.audioUrl ?? null;
  audioUrlCache.set(episodeid, url);
  return url;
}
