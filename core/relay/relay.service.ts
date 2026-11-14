import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { uploadFile, generateSignatureUrl } from "@/lib/oss";
import {
  detectFastLinks,
  hasSensitiveTerm,
  type TimedWord,
} from "@/core/corpus/clip-core";
import { isJunkClip } from "@/core/studio/curator.core";
import { decoratePublicUsers } from "@/core/social/public-user";
import { chinaToday } from "@/core/utils/china-date";

/**
 * [weapp-backend] 跟读接力域服务（yl-weapp home 接力 tab 真实化）。
 *
 * 语义（对 B 原型 server.ts 的一处真实化调整）：targetSteps 恒 3。
 *   发起 = 第 1 棒（用户真录音读起始切片，分取关联评测行）+ 语伴 Elena
 *   （corpus 切片扮演，非 LLM 合成音）自动完成第 2 棒 → RECRUITING 等接棒；
 *   接棒 = 第 3 棒压轴（用户真录音读发起时预置的提示切片）→ 生成合集 →
 *   COMPLETED。B 原型"创建即自动补满秒完成"会让 join 死代码化，故留一棒
 *   给真实社交。
 *
 * 音频协议：USER 棒 = OSS 录音现签直链（audioUrl + duration）；PERSONA 棒
 * audioUrl=null + clipid → 前端 _prepareAudio 懒取 /api/clips/{id}/audio
 * （单一切片出口铁律不破）。录音上传复用 lib/oss.uploadFile（服务端直传，
 * 与 speech evaluate 的 audioBase64 JSON 内联同一上行模式）。
 */

export const TARGET_STEPS = 3;

/** 语伴候选池放大倍数（批量建库同刻同集密集，参照 clips feed OVERFETCH） */
const COMPANION_POOL = 80;
/** audioBase64 上限（60s WAV 16k/16bit ≈ 1.9MB → base64 ≈ 2.6MB） */
const MAX_AUDIO_B64 = 10 * 1024 * 1024;

/** 语伴人格：corpus 切片原声扮演（头像沿用 A 工程 mock 视觉，无缝切换） */
const PERSONA_ELENA = {
  key: "elena",
  name: "Elena · 伦敦精听派",
  avatar:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  voiceStyle: "🎙️ 英伦优雅共鸣腔",
};

/** 招募房第 3 棒虚位（invitedUsers 展示用，Noah 头像占位） */
const PENDING_SLOT = {
  name: "接力虚位 · 等你压轴",
  avatar:
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80",
};

type RelayResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message?: string };

// ── 视图类型（字段名对齐 A 工程 relay-mock 的 WXML 绑定） ──

export interface RelaySegmentView {
  id: string;
  stepOrder: number;
  kind: "USER" | "PERSONA";
  speakerName: string;
  speakerAvatar: string;
  voiceStyle: string;
  textEn: string;
  textCn: string | null;
  words: TimedWord[];
  score: number;
  recordedAt: string;
  isCurrentUser: boolean;
  real: true;
  clipid: string;
  /** USER=OSS 录音现签直链；PERSONA=null（前端按 clipid 懒取切片音频） */
  audioUrl: string | null;
  duration: number | null;
  /** 字幕窗（秒）：PERSONA 懒取音频后 sentenceWindow 用；USER=0..录音时长 */
  start: number;
  end: number;
}

export interface RelayRoomView {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  status: "RECRUITING" | "COMPLETED";
  targetSteps: number;
  initiatorName: string;
  initiatorAvatar: string;
  likes: number;
  likedByMe: boolean;
  invitedUsers: {
    name: string;
    avatar: string;
    status: "joined" | "invited";
  }[];
  segments: RelaySegmentView[];
  nextPromptSegment: {
    clipid: string;
    episodeid: string;
    subtitleId: number;
    textEn: string;
    textCn: string | null;
    phoneticTip: string | null;
    words: TimedWord[];
    duration: number;
    start: number;
    end: number;
    audioUrl: null; // 前端懒取 /api/clips/{clipid}/audio
  } | null;
  compilation: {
    compilationTitle: string;
    chemistryScore: number;
    vibeBadge: string;
    aiDirectorComment: string;
    totalDuration: number;
    generatedAt: string;
  } | null;
}

// ── 小工具 ──

/** WAV 时长（16kHz/mono/16bit = 32000 B/s，去 44 字节头） */
function wavDurationSec(buf: Buffer): number {
  if (buf.length <= 44) return 0;
  return Math.max(0.5, Math.round(((buf.length - 44) / 32000) * 10) / 10);
}

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

/** 数据驱动连读提示（同 clips feed 的 buildPhoneticTip 口径） */
function buildPhoneticTip(words: TimedWord[], wpm: number): string | null {
  const links = detectFastLinks(words);
  if (links.length) {
    const b = links[0];
    const next = words[b.endIdx + 1]?.word;
    const phrase = next ? `${b.text} ${next}` : b.text;
    return `注意 '${phrase}' 中 '${b.text}' 的弱读连读（仅 ${Math.round(b.durationSec * 1000)}ms），粘成一团念更地道。`;
  }
  if (wpm > 0) {
    return `本句语速 ${wpm} 词/分钟，建议 0.75x 慢速跟上后再常速跟读。`;
  }
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── 语伴选片 ──

type CompanionClip = {
  clipid: string;
  episodeid: string;
  startTime: number;
  endTime: number;
  duration: number;
  enText: string;
  zhText: string | null;
  wordsJson: Prisma.JsonValue | null;
  wpm: number;
  cefrLevel: string | null;
  sourceLabel: string | null;
  topicTags: string[];
  speaker: string | null;
};

const companionSelect = {
  clipid: true,
  episodeid: true,
  subtitleId: true,
  startTime: true,
  endTime: true,
  duration: true,
  enText: true,
  zhText: true,
  wordsJson: true,
  wpm: true,
  cefrLevel: true,
  sourceLabel: true,
  topicTags: true,
  speaker: true,
} satisfies Prisma.corpus_clipsSelect;

/**
 * 选 2 片语料：第 2 棒 Elena 扮演片 + 第 3 棒接棒提示片。
 * 口径对齐 clips feed（时长窗/词级时间戳/译文/worthyScore 门禁/junk/红线词），
 * 另排除专享剧集（接力对免费用户可见，不得借道发放专享音频）。
 */
async function pickCompanionClips(
  starter: CompanionClip & { clipid: string },
): Promise<{ personaClip: CompanionClip; promptClip: CompanionClip } | null> {
  for (const levelFilter of [
    starter.cefrLevel ? { cefrLevel: starter.cefrLevel } : {},
    {},
  ] as Prisma.corpus_clipsWhereInput[]) {
    const rows = await prisma.corpus_clips.findMany({
      where: {
        ...levelFilter,
        clipid: { not: starter.clipid },
        duration: { gte: 4, lte: 10 },
        wordsJson: { not: Prisma.DbNull },
        zhText: { not: null },
        OR: [{ worthyScore: { gte: 0.4 } }, { worthyScore: null }],
      },
      select: companionSelect,
      take: COMPANION_POOL,
      orderBy: [{ createdAt: "desc" }, { clipid: "asc" }],
    });

    // 排除专享剧集（候选池按剧集批量判定）
    const eps = await prisma.episode.findMany({
      where: { episodeid: { in: [...new Set(rows.map((r) => r.episodeid))] } },
      select: { episodeid: true, isExclusive: true },
    });
    const exclusive = new Set(
      eps.filter((e) => e.isExclusive).map((e) => e.episodeid),
    );

    const clean = rows.filter(
      (r) =>
        !exclusive.has(r.episodeid) &&
        !isJunkClip(r, { minDurationSec: 4, maxDurationSec: 10 }) &&
        !hasSensitiveTerm(r.enText) &&
        !hasSensitiveTerm(r.zhText),
    );
    if (clean.length < 2) continue;

    const shuffled = shuffle(clean);
    // 提示片：与起始切片同话题优先（接力叙事连贯）
    const promptClip =
      shuffled.find((c) =>
        c.topicTags.some((t) => starter.topicTags.includes(t)),
      ) ?? shuffled[0];
    // 扮演片：跨剧集优先（换节目即换"声线"），排除提示片本身
    const personaClip =
      shuffled.find(
        (c) =>
          c.clipid !== promptClip.clipid && c.episodeid !== starter.episodeid,
      ) ?? shuffled.find((c) => c.clipid !== promptClip.clipid);
    if (promptClip && personaClip) return { personaClip, promptClip };
  }
  return null;
}

// ── 房间视图装配 ──

function parseWords(wordsJson: Prisma.JsonValue | null): TimedWord[] {
  return (Array.isArray(wordsJson) ? wordsJson : []) as TimedWord[];
}

/**
 * USER 棒扫光词表：目标切片 wordsJson 按录音实际时长等比缩放
 * （评测词级时间戳仅 PRO 行落库，免费用户无法取真值；近似扫光 v1 够用）
 */
function scaleWords(words: TimedWord[], factor: number): TimedWord[] {
  if (!factor || !Number.isFinite(factor) || factor === 1 || !words.length) {
    return words;
  }
  return words.map((w) => ({
    ...w,
    start: Math.round((w.start ?? 0) * factor),
    end: Math.round((w.end ?? 0) * factor),
  }));
}

async function buildRoomViews(
  rooms: Prisma.relay_roomGetPayload<{ include: { segments: true } }>[],
  viewerUserid: string,
): Promise<RelayRoomView[]> {
  if (!rooms.length) return [];

  // 批量取：切片 / 公开用户信息 / 当日点赞
  const clipIds = new Set<string>();
  const userIds = new Set<string>();
  for (const room of rooms) {
    clipIds.add(room.starterClipId).add(room.promptClipId);
    userIds.add(room.initiatorUserid);
    for (const seg of room.segments) {
      clipIds.add(seg.clipid);
      if (seg.userid) userIds.add(seg.userid);
    }
  }
  const [clips, users, likeRows, myLikes] = await Promise.all([
    prisma.corpus_clips.findMany({
      where: { clipid: { in: [...clipIds] } },
      select: companionSelect,
    }),
    decoratePublicUsers([...userIds]),
    prisma.social_likes.groupBy({
      by: ["targetId"],
      where: {
        targetType: "RELAY_ROOM",
        targetId: { in: rooms.map((r) => r.roomid) },
        likeDate: chinaToday(),
      },
      _count: { id: true },
    }),
    prisma.social_likes.findMany({
      where: {
        likerUserid: viewerUserid,
        targetType: "RELAY_ROOM",
        targetId: { in: rooms.map((r) => r.roomid) },
        likeDate: chinaToday(),
      },
      select: { targetId: true },
    }),
  ]);
  const clipMap = new Map(clips.map((c) => [c.clipid, c]));
  const likeCount = new Map(likeRows.map((r) => [r.targetId, r._count.id]));
  const likedSet = new Set(myLikes.map((r) => r.targetId));

  // USER 棒录音现签（3h 惯例 TTL）
  const audioKeys = [
    ...new Set(
      rooms.flatMap((r) => r.segments.map((s) => s.audioKey).filter(Boolean)),
    ),
  ] as string[];
  const signedAudio = new Map<string, string>();
  await Promise.all(
    audioKeys.map(async (key) => {
      const url = await generateSignatureUrl(key, 3600 * 3).catch(() => null);
      if (url) signedAudio.set(key, url);
    }),
  );

  const buildSegment = (
    seg: Prisma.relay_roomGetPayload<{
      include: { segments: true };
    }>["segments"][number],
  ): RelaySegmentView | null => {
    const clip = clipMap.get(seg.clipid);
    if (!clip) return null;
    const words = parseWords(clip.wordsJson);

    if (seg.kind === "PERSONA") {
      const persona = PERSONA_ELENA; // 现仅 elena 一位；扩人格时按 personaKey 分发
      return {
        id: seg.segid,
        stepOrder: seg.stepOrder,
        kind: "PERSONA",
        speakerName: persona.name,
        speakerAvatar: persona.avatar,
        voiceStyle: persona.voiceStyle,
        textEn: clip.enText,
        textCn: clip.zhText,
        words,
        score: seg.score ?? 0,
        recordedAt: relativeTime(seg.createdAt),
        isCurrentUser: false,
        real: true,
        clipid: clip.clipid,
        audioUrl: null,
        duration: seg.duration ?? clip.duration,
        start: clip.startTime,
        end: clip.endTime,
      };
    }

    const user = seg.userid ? users.get(seg.userid) : null;
    const recDuration = seg.duration ?? clip.duration;
    // 扫光词表缩放：录音时长 / 目标切片末词时刻
    const lastEnd = words.length ? (words[words.length - 1].end ?? 0) : 0;
    const factor =
      lastEnd > 0 && clip.duration > 0
        ? (recDuration * 1000) / Math.min(lastEnd, clip.duration * 1000)
        : 1;
    return {
      id: seg.segid,
      stepOrder: seg.stepOrder,
      kind: "USER",
      speakerName: user?.nickname ?? "远路学习者",
      speakerAvatar: user?.avatar ?? PENDING_SLOT.avatar,
      voiceStyle: "🎤 真人真声出镜",
      textEn: clip.enText,
      textCn: clip.zhText,
      words: scaleWords(words, factor),
      score: seg.score ?? 0,
      recordedAt: relativeTime(seg.createdAt),
      isCurrentUser: seg.userid === viewerUserid,
      real: true,
      clipid: clip.clipid,
      audioUrl: seg.audioKey ? (signedAudio.get(seg.audioKey) ?? null) : null,
      duration: recDuration,
      start: 0,
      end: recDuration,
    };
  };

  return rooms.map((room) => {
    const initiator = users.get(room.initiatorUserid);
    const segments = room.segments
      .slice()
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map(buildSegment)
      .filter((s): s is RelaySegmentView => !!s);

    const joinerSeg = segments.find(
      (s) => s.kind === "USER" && s.stepOrder === TARGET_STEPS,
    );

    // 合集元数据读时装饰（generatedAt 落相对时间）
    const comp = room.compilation as {
      title: string;
      chemistryScore: number;
      vibeBadge: string;
      directorComment: string;
      totalDuration: number;
      generatedAtMs: number;
    } | null;

    return {
      id: room.roomid,
      title: room.title,
      topic: room.topic || "",
      difficulty: room.difficulty || "",
      status: room.status as "RECRUITING" | "COMPLETED",
      targetSteps: TARGET_STEPS,
      initiatorName: initiator?.nickname ?? "远路学习者",
      initiatorAvatar: initiator?.avatar ?? PENDING_SLOT.avatar,
      likes: likeCount.get(room.roomid) ?? 0,
      likedByMe: likedSet.has(room.roomid),
      invitedUsers: [
        {
          name: `${PERSONA_ELENA.name} (已响应)`,
          avatar: PERSONA_ELENA.avatar,
          status: "joined",
        },
        room.status === "COMPLETED" && joinerSeg
          ? {
              name: `${joinerSeg.speakerName} (压轴)`,
              avatar: joinerSeg.speakerAvatar,
              status: "joined",
            }
          : { ...PENDING_SLOT, status: "invited" },
      ],
      segments,
      nextPromptSegment:
        room.status === "RECRUITING"
          ? (() => {
              const pc = clipMap.get(room.promptClipId);
              if (!pc) return null;
              const words = parseWords(pc.wordsJson);
              return {
                clipid: pc.clipid,
                episodeid: pc.episodeid,
                subtitleId: pc.subtitleId,
                textEn: pc.enText,
                textCn: pc.zhText,
                phoneticTip: buildPhoneticTip(words, pc.wpm),
                words,
                duration: pc.duration,
                start: pc.startTime,
                end: pc.endTime,
                audioUrl: null,
              };
            })()
          : null,
      compilation: comp
        ? {
            compilationTitle: comp.title,
            chemistryScore: comp.chemistryScore,
            vibeBadge: comp.vibeBadge,
            aiDirectorComment: comp.directorComment,
            totalDuration: comp.totalDuration,
            generatedAt: relativeTime(new Date(comp.generatedAtMs)),
          }
        : null,
    };
  });
}

// ── 合集生成 ──

function vibeBadgeOf(score: number): string {
  if (score >= 95) return "🔥 殿堂级丝滑转场";
  if (score >= 90) return "✨ 默契十足无缝转场";
  if (score >= 80) return "🎧 渐入佳境好搭档";
  return "🌱 接力新芽未来可期";
}

function directorCommentOf(params: {
  initiatorName: string;
  joinerName: string;
  topic: string;
  chemistryScore: number;
}): string {
  const { initiatorName, joinerName, topic, chemistryScore } = params;
  const pool = [
    `${initiatorName} 的首棒定下 ${topic} 的叙事基调，Elena 紧随其后的原声切片带来跨节目声线碰撞，${joinerName} 压轴收束干脆利落——三棒化学反应 ${chemistryScore} 分，值得反复回味！`,
    `从 ${initiatorName} 开腔到 ${joinerName} 收尾，三种声线在 ${topic} 话题里层层递进，转场自然得像排练过一整季。化学值 ${chemistryScore}，这就是接力的魅力。`,
    `${topic} 的三人跨界实验成功！${initiatorName} 起势沉稳，Elena 的播音腔把质感拉满，${joinerName} 的压轴给整段画上惊叹号。默契度 ${chemistryScore} 分，下期再约！`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 对外服务 ──

/** GET /api/relay/list —— 招募房优先，updatedAt 倒序，top N */
export async function listRooms(
  viewerUserid: string,
  limit = 20,
): Promise<RelayRoomView[]> {
  const rooms = await prisma.relay_room.findMany({
    include: { segments: true },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }], // RECRUITING 字典序 > COMPLETED
    take: Math.min(50, Math.max(1, limit)),
  });
  return buildRoomViews(rooms, viewerUserid);
}

/**
 * POST /api/relay/create —— 发起接力。
 * 前端先走 /api/speech/evaluate（配额/会员/评测全复用），携 recognitionId
 * + 录音 base64 到此建房：分取关联评测行 overallScore，录音上传 OSS。
 */
export async function createRoom(params: {
  userid: string;
  clipId: string;
  title?: string;
  recognitionId: number;
  audioBase64: string;
}): Promise<RelayResult<{ room: RelayRoomView }>> {
  const { userid, clipId, title, recognitionId, audioBase64 } = params;

  const starter = (await prisma.corpus_clips.findUnique({
    where: { clipid: clipId },
    select: companionSelect,
  })) as (CompanionClip & { clipid: string }) | null;
  if (!starter) {
    return { ok: false, code: "CLIP_NOT_FOUND", message: "起始切片不存在" };
  }

  const rec = await prisma.speech_recognition.findUnique({
    where: { recognitionid: recognitionId },
    select: { userid: true, overallScore: true },
  });
  if (!rec || rec.userid !== userid) {
    return {
      ok: false,
      code: "INVALID_RECOGNITION",
      message: "评测记录无效，请重新录音",
    };
  }

  if (!audioBase64 || audioBase64.length < 1000) {
    return { ok: false, code: "EMPTY_AUDIO", message: "录音为空，请重试" };
  }
  if (audioBase64.length > MAX_AUDIO_B64) {
    return { ok: false, code: "AUDIO_TOO_LARGE", message: "录音过长" };
  }
  const wavBuf = Buffer.from(audioBase64, "base64");
  const recDuration = wavDurationSec(wavBuf);

  const companions = await pickCompanionClips(starter);
  if (!companions) {
    return {
      ok: false,
      code: "CORPUS_UNAVAILABLE",
      message: "语料暂不可用，请稍后重试",
    };
  }

  // 录音直传 OSS（私有读，回放现签）
  const objectKey = `yuanlu/relay/${userid}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.wav`;
  let audioKey: string;
  try {
    const uploaded = await uploadFile(wavBuf, objectKey);
    audioKey = uploaded.fileName;
  } catch (error) {
    console.error("[relay.createRoom] upload failed", error);
    return { ok: false, code: "UPLOAD_FAILED", message: "录音上传失败" };
  }

  const topic = starter.topicTags[0] || "现代生活";
  const defaultTitle = `⚡ ${starter.sourceLabel || topic} · 三人跨界接力`;
  const personaScore = 95 + Math.floor(Math.random() * 4); // 原声扮演，稳定高分的合成口径

  const room = await prisma.relay_room.create({
    data: {
      title: (title || "").trim().slice(0, 30) || defaultTitle,
      topic,
      difficulty: starter.cefrLevel,
      status: "RECRUITING",
      initiatorUserid: userid,
      starterClipId: starter.clipid,
      promptClipId: companions.promptClip.clipid,
      segments: {
        create: [
          {
            stepOrder: 1,
            kind: "USER",
            userid,
            clipid: starter.clipid,
            audioKey,
            score: rec.overallScore ?? 0,
            duration: recDuration,
            recognitionid: recognitionId,
          },
          {
            stepOrder: 2,
            kind: "PERSONA",
            personaKey: PERSONA_ELENA.key,
            clipid: companions.personaClip.clipid,
            score: personaScore,
            duration: companions.personaClip.duration,
          },
        ],
      },
    },
    include: { segments: true },
  });

  const [view] = await buildRoomViews([room], userid);
  return { ok: true, data: { room: view } };
}

/** POST /api/relay/join —— 第 3 棒压轴：建 USER 棒 + 生成合集 + COMPLETED */
export async function joinRoom(params: {
  userid: string;
  roomId: string;
  recognitionId: number;
  audioBase64: string;
}): Promise<RelayResult<{ room: RelayRoomView }>> {
  const { userid, roomId, recognitionId, audioBase64 } = params;

  const room = await prisma.relay_room.findUnique({
    where: { roomid: roomId },
    include: { segments: true },
  });
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "接力房不存在" };
  }
  if (room.status !== "RECRUITING") {
    return { ok: false, code: "ROOM_NOT_RECRUITING", message: "该接力已完成" };
  }
  if (room.segments.length >= TARGET_STEPS) {
    return { ok: false, code: "ROOM_FULL", message: "接力棒次已满" };
  }

  const rec = await prisma.speech_recognition.findUnique({
    where: { recognitionid: recognitionId },
    select: { userid: true, overallScore: true },
  });
  if (!rec || rec.userid !== userid) {
    return {
      ok: false,
      code: "INVALID_RECOGNITION",
      message: "评测记录无效，请重新录音",
    };
  }

  if (!audioBase64 || audioBase64.length < 1000) {
    return { ok: false, code: "EMPTY_AUDIO", message: "录音为空，请重试" };
  }
  if (audioBase64.length > MAX_AUDIO_B64) {
    return { ok: false, code: "AUDIO_TOO_LARGE", message: "录音过长" };
  }
  const wavBuf = Buffer.from(audioBase64, "base64");
  const recDuration = wavDurationSec(wavBuf);

  const objectKey = `yuanlu/relay/${userid}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.wav`;
  let audioKey: string;
  try {
    const uploaded = await uploadFile(wavBuf, objectKey);
    audioKey = uploaded.fileName;
  } catch (error) {
    console.error("[relay.joinRoom] upload failed", error);
    return { ok: false, code: "UPLOAD_FAILED", message: "录音上传失败" };
  }

  // 合集：化学值=三棒均分取整；总时长=三棒音频时长之和
  const segScores = [
    ...room.segments.map((s) => s.score ?? 0),
    rec.overallScore ?? 0,
  ];
  const chemistryScore = Math.round(
    segScores.reduce((a, b) => a + b, 0) / segScores.length,
  );
  const totalDuration =
    Math.round(
      (room.segments.reduce((a, s) => a + (s.duration ?? 0), 0) + recDuration) *
        10,
    ) / 10;

  const [initiator, joiner] = await Promise.all([
    decoratePublicUsers([room.initiatorUserid]).then((m) =>
      m.get(room.initiatorUserid),
    ),
    decoratePublicUsers([userid]).then((m) => m.get(userid)),
  ]);
  const compilation = {
    title: `🎬 《${room.topic || room.title}》三人跨界播客合集`,
    chemistryScore,
    vibeBadge: vibeBadgeOf(chemistryScore),
    directorComment: directorCommentOf({
      initiatorName: initiator?.nickname ?? "发起人",
      joinerName: joiner?.nickname ?? "接棒人",
      topic: room.topic || "跨界",
      chemistryScore,
    }),
    totalDuration,
    generatedAtMs: Date.now(),
  };

  const updated = await prisma.relay_room.update({
    where: { roomid: roomId },
    data: {
      status: "COMPLETED",
      compilation: compilation as unknown as Prisma.InputJsonValue,
      segments: {
        create: {
          stepOrder: TARGET_STEPS,
          kind: "USER",
          userid,
          clipid: room.promptClipId,
          audioKey,
          score: rec.overallScore ?? 0,
          duration: recDuration,
          recognitionid: recognitionId,
        },
      },
    },
    include: { segments: true },
  });

  const [view] = await buildRoomViews([updated], userid);
  return { ok: true, data: { room: view } };
}

/** POST /api/relay/like —— 当日幂等点赞（social_likes 读时 count） */
export async function likeRoom(
  userid: string,
  roomId: string,
): Promise<RelayResult<{ likes: number; likedByMe: boolean }>> {
  const room = await prisma.relay_room.findUnique({
    where: { roomid: roomId },
    select: { roomid: true },
  });
  if (!room) {
    return { ok: false, code: "ROOM_NOT_FOUND", message: "接力房不存在" };
  }

  const today = chinaToday();
  await prisma.social_likes
    .create({
      data: {
        likerUserid: userid,
        targetType: "RELAY_ROOM",
        targetId: roomId,
        likeDate: today,
      },
    })
    .catch(() => undefined); // 当日重复点赞幂等（unique 冲突吞掉）

  const [row] = await prisma.social_likes.groupBy({
    by: ["targetId"],
    where: { targetType: "RELAY_ROOM", targetId: roomId, likeDate: today },
    _count: { id: true },
  });
  return { ok: true, data: { likes: row?._count.id ?? 0, likedByMe: true } };
}
