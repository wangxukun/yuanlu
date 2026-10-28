/**
 * scripts/test-corpus.mjs — [RESHAPE T1.1-T1.4] 语料原子化全链路单测
 *
 * 覆盖：
 *   一、clip-core：切片过滤（过短/语气词/词数）、WPM、⚡连读词块、音素标签、
 *      微剧场聚合（窗口上限/大间隙断组/短组缝合）、deep-dive 映射
 *   二、clip-slice.core：切片窗口（前后让位/45s 硬闸门/非法窗口）、FFmpeg 参数
 *   三、clip-audio.service（DI）：缓存命中零转码、冷路径转码+回填、
 *      NOT_FOUND/TOO_LONG/SLICE_UNAVAILABLE、并发单飞
 *   四、curator.core：关键词清洗、多路召回 where、意图/精选白名单清洗、
 *      弱音画像解析（多形态容错）、双螺旋处方装配
 *   五、studio-generate.service（DI）：会员门禁、频率限制、LLM 降级、
 *      NO_MATCH、happy path 落库（items 携带 clipId 新列）
 *   六、clip-attach.core（T1.3-4 additive 装饰器）：索引/未命中原样/缓存签发/
 *      未缓存零转码零签名/签名失败不抛错/偏移时长口径/where 构造分组去重
 *
 * 运行：node scripts/test-corpus.mjs（yuanlu 仓；不依赖 DB/网络/OSS）
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = pathToFileURL(path.join(__dirname, "..") + path.sep).href;

// resolve 钩子：@/ 别名映射 + 无扩展名 TS 导入补 .ts（服务文件复用 Next 路径别名）
registerHooks({
  resolve(specifier, context, nextResolve) {
    let spec = specifier;
    if (spec.startsWith("@/")) spec = ROOT + spec.slice(2);
    if (
      (spec.startsWith(".") || spec.startsWith("file:")) &&
      !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)
    ) {
      try {
        return nextResolve(spec + ".ts", context);
      } catch {
        /* 回落原始 specifier */
      }
    }
    return nextResolve(spec, context);
  },
});

const clipCore = await import("../core/corpus/clip-core.ts");
const sliceCore = await import("../core/corpus/clip-slice.core.ts");
const { clipAudioService } = await import(
  "../core/corpus/clip-audio.service.ts"
);
const curatorCore = await import("../core/studio/curator.core.ts");
const studioMod = await import("../core/studio/studio-generate.service.ts");
const attachMod = await import("../core/corpus/clip-attach.core.ts");

let failed = 0;
function assert(cond, msg) {
  if (cond) console.log("PASS:", msg);
  else {
    console.error("FAIL:", msg);
    failed++;
  }
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

console.log("━━━ 一、clip-core：切片构建 / 声学指纹 / 微剧场聚合 ━━━");
{
  const subs = [
    // 合格句：6 词，含 kind(80ms)+of(60ms) 连读块
    {
      id: 1,
      start: 10,
      end: 16,
      textEn: "I kind of wanted to ask about the plan",
      textCn: "我有点想问问计划",
      speaker: "SPEAKER_1",
      words: [
        { word: "I", start: 10.1, end: 10.25 },
        { word: "kind", start: 10.3, end: 10.38 },
        { word: "of", start: 10.39, end: 10.45 },
        { word: "wanted", start: 10.6, end: 11.3 },
        { word: "to", start: 11.35, end: 11.44 },
        { word: "ask", start: 11.6, end: 12.1 },
        { word: "about", start: 12.3, end: 12.7 },
        { word: "the", start: 12.8, end: 12.9 },
        { word: "plan", start: 13.0, end: 13.6 },
      ],
    },
    // 过短（<2.5s）
    {
      id: 2,
      start: 20,
      end: 21.5,
      textEn: "Too short here yes",
      words: [{ word: "a", start: 20, end: 20.5 }],
    },
    // 纯语气词
    { id: 3, start: 30, end: 34, textEn: "Yeah.", words: [] },
    { id: 4, start: 40, end: 44, textEn: "Oh, really?", words: [] },
    // 词数不足（<4 有效词）
    {
      id: 5,
      start: 50,
      end: 56,
      textEn: "Two words only",
      words: [
        { word: "two", start: 50, end: 50.5 },
        { word: "words", start: 50.6, end: 51.2 },
      ],
    },
    // 合格句（正常语速）
    {
      id: 6,
      start: 60,
      end: 67,
      textEn: "She was thinking about the whole thing again",
      textCn: "她又在想整件事",
      words: [
        { word: "she", start: 60.1, end: 60.4 },
        { word: "was", start: 60.5, end: 60.7 },
        { word: "thinking", start: 60.8, end: 61.5 },
        { word: "about", start: 61.6, end: 61.9 },
        { word: "the", start: 62.0, end: 62.1 },
        { word: "whole", start: 62.2, end: 62.6 },
        { word: "thing", start: 62.7, end: 63.2 },
        { word: "again", start: 63.4, end: 63.9 },
      ],
    },
  ];

  const drafts = clipCore.buildClipsFromSubtitles("ep1", subs);
  assert(
    drafts.length === 2,
    "过滤过短/语气词/词数不足 → 仅 2 条合格切片（实际 " + drafts.length + "）",
  );
  const d1 = drafts[0];
  assert(d1.subtitleId === 1 && d1.enText.length > 0, "首条 = 字幕句 1");
  assert(
    d1.wpm === 154,
    "WPM = 词数/首末词跨度（9 词/3.5s = 154，实际 " + d1.wpm + "）",
  );
  const links = d1.acousticFlags?.fastLinks || [];
  assert(
    links.some((b) => b.text === "kind of") &&
      links.some((b) => b.text === "the"),
    "⚡连读块：kind of 并块 + the 独立块（间隙过大）",
  );
  assert(
    d1.phonemeTags.includes("θ") && drafts[1].phonemeTags.includes("ŋ"),
    "音素标签：句1 the→θ / 句2 thinking→ŋ",
  );
  assert(
    drafts[0].wordCount === 9 && drafts[1].wordCount === 8,
    "wordCount 有效词计数",
  );

  // end 缺省兜底 = start+3
  const fallback = clipCore.buildClipsFromSubtitles("ep2", [
    {
      id: 9,
      start: 100,
      textEn: "One two three four five six seven",
      words: [1, 2, 3, 4, 5, 6, 7].map((i) => ({
        word: "w" + i,
        start: 100 + i * 0.5,
        end: 100 + i * 0.5 + 0.4,
      })),
    },
  ]);
  assert(
    fallback.length === 1 && near(fallback[0].duration, 3),
    "end 缺省 = start+3 窗口兜底（时长 3s）",
  );

  // 微剧场聚合：句 1(10-16) → 句 6(60-67) 间隙 44s > 8s → 断组；各自不足 3 句 → 0 场景
  const scenes0 = clipCore.groupScenes("ep1", drafts);
  assert(scenes0.length === 0, "大间隙断组 + 每组 <3 句 → 0 场景");

  // 连续句聚合：3 句相邻（间隙 1s）→ 1 场景；句长 5s×3=15s 达下限
  const seq = [0, 1, 2].map((i) => ({
    episodeid: "epS",
    subtitleId: i + 1,
    startTime: i * 6,
    endTime: i * 6 + 5,
    duration: 5,
    enText: "Sentence number " + (i + 1) + " here",
    zhText: "第" + (i + 1) + "句",
    speaker: null,
    wordsJson: [],
    wpm: 100,
    acousticFlags: null,
    phonemeTags: [],
    wordCount: 6,
  }));
  const scenes1 = clipCore.groupScenes("epS", seq);
  assert(
    scenes1.length === 1 && scenes1[0].clips.length === 3,
    "3 相邻句 → 1 场景 3 句",
  );
  assert(
    near(scenes1[0].startTime, 0) && near(scenes1[0].duration, 17),
    "场景窗口 [0,17s]（含 2 个 1s 间隙）",
  );

  // maxTotalSec 收口：6 句 ×8s（7s 间隙）→ 每场景 ≤4 句（8*4+gap=35 ≤40，第 5 句超限断）
  const long = Array.from({ length: 9 }, (_, i) => ({
    episodeid: "epL",
    subtitleId: i + 1,
    startTime: i * 8,
    endTime: i * 8 + 7,
    duration: 7,
    enText: "Long sentence " + (i + 1) + " with words",
    zhText: "长句" + (i + 1),
    speaker: null,
    wordsJson: [],
    wpm: 90,
    acousticFlags: null,
    phonemeTags: [],
    wordCount: 6,
  }));
  const scenesL = clipCore.groupScenes("epL", long);
  assert(
    scenesL.every(
      (s) => s.clips.length >= 3 && s.clips.length <= 6 && s.duration <= 40,
    ),
    "多场景全部满足 [3,6] 句 / ≤40s（场景数 " + scenesL.length + "）",
  );

  // deep-dive 映射：词命中/句命中进窗口，未命中不挂
  const dd = {
    vocabulary: [
      { word: "plan", phonetic: "/plæn/", meaning: "计划", reason: "普通名词" },
      { word: "kaleidoscope", meaning: "万花筒", reason: "不在窗口" },
    ],
    sentences: [
      {
        text: "I kind of wanted to ask about the plan",
        analysis: "kind of 软化语气",
      },
      { text: "Something totally unrelated", analysis: "不应挂入" },
    ],
    quiz: [
      {
        question: "What does 'kind of' soften?",
        options: ["A", "B"],
        answerIndex: 0,
        explanation: "",
      },
    ],
  };
  const mapped = clipCore.mapDeepDiveIntoScenes(
    [
      {
        episodeid: "e",
        title: "t",
        summaryZh: null,
        startTime: 10,
        endTime: 16,
        duration: 6,
        clips: [
          {
            clipid: "c1",
            subtitleId: 1,
            start: 10,
            end: 16,
            textEn: "I kind of wanted to ask about the plan",
            textCn: null,
            speaker: null,
            words: [],
          },
        ],
      },
    ],
    dd,
  );
  assert(
    mapped[0] &&
      mapped[0].vocabulary.length === 1 &&
      mapped[0].vocabulary[0].word === "plan" &&
      mapped[0].sentences.length === 1,
    "deep-dive 映射：词 plan/原句命中，万花筒与无关句被过滤",
  );
  assert(
    clipCore.mapDeepDiveIntoScenes(
      [
        {
          episodeid: "e",
          title: "t",
          summaryZh: null,
          startTime: 0,
          endTime: 1,
          duration: 1,
          clips: [],
        },
      ],
      null,
    )[0] === null,
    "无 deep-dive → null",
  );
}

console.log("━━━ 二、clip-slice.core：窗口 / FFmpeg 参数 ━━━");
{
  const w = sliceCore.computeSliceWindow("cid1", {
    startTime: 100,
    endTime: 108,
  });
  assert(
    w.ok && near(w.window.sliceStart, 99.75) && near(w.window.sliceEnd, 108.35),
    "窗口 = [start-0.25, end+0.35]",
  );
  assert(
    w.ok && near(w.window.duration, 8.6) && near(w.window.clipOffset, 99.75),
    "时长 8.6s / clipOffset=sliceStart（对齐协议）",
  );
  assert(
    w.ok && w.window.objectKey === "yuanlu/clips/cid1.mp3",
    "OSS key = yuanlu/clips/{id}.mp3",
  );

  const head = sliceCore.computeSliceWindow("cid2", {
    startTime: 0.1,
    endTime: 0.5,
  });
  assert(
    head.ok && near(head.window.sliceStart, 0),
    "起点让位不越过 0（max(0, start-0.25)）",
  );

  assert(
    sliceCore.computeSliceWindow("x", { startTime: 50, endTime: 50 }).ok ===
      false,
    "end<=start → INVALID_WINDOW",
  );
  assert(
    sliceCore.computeSliceWindow("x", { startTime: 0, endTime: 90 }).code ===
      "TOO_LONG",
    ">45s → TOO_LONG 硬闸门（红线 2 服务端）",
  );

  const args = sliceCore.buildFfmpegArgs({
    sourceUrl: "https://oss/e1.m4a?sig",
    sliceStart: 99.75,
    duration: 8.6,
  });
  const joined = args.join(" ");
  assert(
    joined.includes("-ss 99.750") && joined.includes("-t 8.600"),
    "FFmpeg：输入 seek -ss 99.750 + -t 8.600",
  );
  assert(
    joined.includes("afade=t=in:st=0:d=0.15") &&
      joined.includes("afade=t=out:st=8.450:d=0.15"),
    "FFmpeg：双端 150ms 淡入淡出",
  );
  assert(
    joined.includes("-ac 1") &&
      joined.includes("-ar 24000") &&
      joined.includes("-b:a 64k") &&
      joined.includes("pipe:1"),
    "FFmpeg：64k/24kHz/mono → stdout",
  );
}

console.log("━━━ 三、clip-audio.service（DI mock）：缓存 / 转码 / 单飞 ━━━");
{
  const calls = {
    exists: [],
    put: [],
    ffmpeg: 0,
    sign: [],
    clipUpdate: 0,
    sceneUpdate: 0,
  };
  const ffmpegBuffer = Buffer.from("fake-mp3-bytes");
  const makeDeps = (rows) => ({
    prisma: {
      corpus_clips: {
        findUnique: async ({ where: { clipid } }) =>
          rows.clips.find((c) => c.clipid === clipid) || null,
      },
      micro_scenes: {
        findUnique: async ({ where: { sceneid } }) =>
          rows.scenes.find((s) => s.sceneid === sceneid) || null,
      },
      episode: {
        findUnique: async ({ where: { episodeid } }) =>
          rows.episodes.find((e) => e.episodeid === episodeid) || null,
      },
      corpus_clips_update: async () => {
        calls.clipUpdate++;
      },
      micro_scenes_update: async () => {
        calls.sceneUpdate++;
      },
    },
    oss: {
      exists: async (key) => {
        calls.exists.push(key);
        return rows.ossObjects.has(key);
      },
      resolveSourceUrl: async (episodeid) => {
        const ep = rows.episodes.find((e) => e.episodeid === episodeid);
        return ep ? ep.signedSource : null;
      },
      put: async (key) => {
        calls.put.push(key);
        rows.ossObjects.add(key);
      },
      sign: async (key) => {
        calls.sign.push(key);
        return "https://signed/" + key;
      },
    },
    runFfmpeg: async () => {
      calls.ffmpeg++;
      if (rows.ffmpegFail) throw new Error("boom");
      return ffmpegBuffer;
    },
  });

  const rows = {
    clips: [
      {
        clipid: "c1",
        episodeid: "ep1",
        startTime: 100,
        endTime: 108,
        clipAudioKey: null,
      },
      {
        clipid: "cLong",
        episodeid: "ep1",
        startTime: 0,
        endTime: 100,
        clipAudioKey: null,
      },
    ],
    scenes: [
      {
        sceneid: "s1",
        episodeid: "ep1",
        startTime: 200,
        endTime: 220,
        clipAudioKey: null,
      },
    ],
    episodes: [
      {
        episodeid: "ep1",
        audioFileName: "yuanlu/audio/ep1.m4a",
        audioUrl: "raw",
        signedSource: "https://signed-source/ep1.m4a",
      },
    ],
    ossObjects: new Set(["yuanlu/clips/cHit.mp3"]),
  };
  // 缓存命中场景行
  rows.clips.push({
    clipid: "cHit",
    episodeid: "ep1",
    startTime: 10,
    endTime: 18,
    clipAudioKey: "yuanlu/clips/cHit.mp3",
  });

  const deps = makeDeps(rows);

  // NOT_FOUND
  const nf = await clipAudioService.ensureClipAudio("nope", deps);
  assert(!nf.ok && nf.code === "NOT_FOUND", "未知 id → NOT_FOUND");

  // 缓存命中：零转码直接签发
  const hit = await clipAudioService.ensureClipAudio("cHit", deps);
  assert(
    hit.ok &&
      hit.cached === true &&
      hit.url === "https://signed/yuanlu/clips/cHit.mp3",
    "缓存命中 → 直接签发（cached=true）",
  );
  assert(calls.ffmpeg === 0, "缓存命中零 FFmpeg 调用");

  // 冷路径：FFmpeg → 上传 OSS → 回填 key → 签发
  calls.ffmpeg = 0;
  const cold = await clipAudioService.ensureClipAudio("c1", deps);
  assert(
    cold.ok &&
      cold.cached === false &&
      near(cold.duration, 8.6) &&
      near(cold.clipOffset, 99.75),
    "冷路径 → 转码并签发（协议字段 duration/clipOffset）",
  );
  assert(
    calls.ffmpeg === 1 &&
      calls.put[0] === "yuanlu/clips/c1.mp3" &&
      calls.clipUpdate === 1,
    "FFmpeg 一次 + OSS put yuanlu/clips/c1.mp3 + clipAudioKey 回填",
  );

  // 并发单飞：同 id 并发仅一次转码
  rows.ossObjects.delete("yuanlu/clips/c1.mp3");
  calls.ffmpeg = 0;
  const [a, b] = await Promise.all([
    clipAudioService.ensureClipAudio("c1", deps),
    clipAudioService.ensureClipAudio("c1", deps),
  ]);
  assert(calls.ffmpeg === 1 && a.ok && b.ok, "同 id 并发单飞（FFmpeg 恰一次）");

  // 微剧场切片 + 超长拒绝
  const scene = await clipAudioService.ensureClipAudio("s1", deps);
  assert(
    scene.ok && near(scene.duration, 20.6),
    "微剧场按 sceneid 切片（20s+让位 0.6）",
  );
  const tooLong = await clipAudioService.ensureClipAudio("cLong", deps);
  assert(
    !tooLong.ok && tooLong.code === "TOO_LONG",
    "100s 脏数据 → TOO_LONG 拒绝（绝不切片整集）",
  );

  // FFmpeg 失败 → SLICE_UNAVAILABLE
  rows.ffmpegFail = true;
  const broken = await clipAudioService.ensureClipAudio(
    "cLong2",
    makeDeps({
      ...rows,
      clips: [
        {
          clipid: "cLong2",
          episodeid: "ep1",
          startTime: 10,
          endTime: 18,
          clipAudioKey: null,
        },
      ],
    }),
  );
  assert(
    !broken.ok && broken.code === "SLICE_UNAVAILABLE",
    "FFmpeg 失败 → SLICE_UNAVAILABLE（503 语义）",
  );
  rows.ffmpegFail = false;

  // 源音频缺失
  const noSrc = await clipAudioService.ensureClipAudio(
    "cNoSrc",
    makeDeps({
      clips: [
        {
          clipid: "cNoSrc",
          episodeid: "epX",
          startTime: 10,
          endTime: 18,
          clipAudioKey: null,
        },
      ],
      scenes: [],
      episodes: [],
      ossObjects: new Set(),
    }),
  );
  assert(
    !noSrc.ok && noSrc.code === "NO_SOURCE_AUDIO",
    "源音频缺失 → NO_SOURCE_AUDIO",
  );
}

console.log("━━━ 四、curator.core：召回 / 清洗 / 弱音 / 处方装配 ━━━");
{
  const kw = curatorCore.sanitizeKeywords([
    "Hello",
    "  push  back  ",
    "a",
    "",
    "X",
    "timeline",
    "x",
    42,
    null,
    "Push Back",
  ]);
  assert(
    JSON.stringify(kw) === JSON.stringify(["hello", "push back", "timeline"]),
    "关键词清洗：去标点/压空白/去重/丢弃单字母与非串",
  );

  const where = curatorCore.buildRecallWhere({
    keywordsEn: ["push back"],
    keywordsZh: ["延期"],
    phoneme: "θ",
  });
  assert(
    where.OR.length === 3 && where.cefrLevel === undefined,
    "三路 OR（英/中/音素），无难度时不收紧",
  );
  const whereCefr = curatorCore.buildRecallWhere({
    keywordsEn: ["ok-word"],
    cefrLevels: ["B2", "C1"],
  });
  assert(
    whereCefr.cefrLevel && whereCefr.cefrLevel.in.length === 2,
    "cefrLevels 收紧为 in 查询",
  );
  assert(
    curatorCore.buildRecallWhere({ keywordsEn: [], keywordsZh: [] }) === null,
    "零关键词 → null（调用方走兜底池）",
  );

  const intent = curatorCore.sanitizeIntent({
    intentSummary: "委婉解释项目延期",
    searchKeywordsEn: ["push back", "timeline"],
    searchKeywordsZh: ["延期"],
    grammarPatterns: ["would have"],
    targetCefr: "b2",
    moodTone: "诚恳",
    curatorIntro: "为你挑了几句既有分寸又留余地的表达",
  });
  assert(
    intent &&
      intent.targetCefr === "B2" &&
      intent.searchKeywordsEn[0] === "push back",
    "意图清洗：CEFR 归一/关键词入列",
  );
  assert(
    curatorCore.sanitizeIntent({
      intentSummary: "",
      searchKeywordsEn: [],
      searchKeywordsZh: [],
    }) === null,
    "全空意图 → null",
  );
  assert(
    curatorCore.sanitizeIntent({ targetCefr: "Z9" }) === null,
    "空意图（含非法 CEFR）→ null",
  );

  const valid = new Set(["c1", "c2", "c3"]);
  const curated = curatorCore.sanitizeCuration(
    [
      { clipid: "c2", note: "x".repeat(400), question: "q" },
      { clipid: "hack" },
      { clipid: "c1" },
      { clipid: "c1" },
      "junk",
    ],
    valid,
  );
  assert(
    curated.length === 2 &&
      curated[0].clipid === "c2" &&
      curated[0].note.length === 300,
    "精选清洗：白名单过滤/去重/批注截 300",
  );

  // 弱音画像：Record 形态 + 数组形态
  const weak1 = curatorCore.topWeakPhonemes(
    {
      θ: { avg: 64, errorCount: 9 },
      v: { avg: 88, errorCount: 2 },
      r: { avg: 91 },
    },
    2,
  );
  assert(
    JSON.stringify(weak1) === JSON.stringify(["θ", "v"]),
    "Record 画像 → [θ, v]（均分升序，≥90 剔除）",
  );
  const weak2 = curatorCore.topWeakPhonemes(
    {
      phonemes: [
        { phoneme: "l", score: 55 },
        { phoneme: "ŋ", score: 70 },
      ],
    },
    1,
  );
  assert(
    JSON.stringify(weak2) === JSON.stringify(["l"]),
    "数组画像兼容（score 字段）",
  );
  assert(curatorCore.topWeakPhonemes(null).length === 0, "空画像 → []");

  // 双螺旋装配
  const clipOf = (id) => ({
    clipid: id,
    episodeid: "ep" + id,
    enText: "The resilient team pushed back",
    zhText: null,
    startTime: 1,
    endTime: 9,
    duration: 8,
    wpm: 100,
    cefrLevel: "B2",
    coverUrl: null,
    sourceLabel: "S",
  });
  const { cards, partial } = curatorCore.assemblePrescription({
    dueVocab: [
      { word: "resilient", episodeid: "epOrigin" },
      { word: "missing", episodeid: null },
    ],
    clipsByWord: { resilient: [clipOf("a")] },
    weakPhonemes: ["θ", "v"],
    clipsByPhoneme: { θ: [clipOf("b")], v: [clipOf("c")] },
    scene: {
      sceneid: "s9",
      title: "职场沟通",
      situationTag: "职场",
      cefrLevel: "B2",
      coverUrl: null,
      duration: 28,
      summaryZh: null,
    },
  });
  assert(
    cards.length === 4 && partial === false,
    "装配 4 卡（缺词卡缺位）非 partial",
  );
  assert(
    cards[0].type === "vocab_revival" && cards[0].focus === "resilient",
    "第 1 卡 = 生词重逢",
  );
  const range = cards[0].focusRange;
  assert(
    range &&
      cards[0].enText.slice(range[0], range[1]).toLowerCase() === "resilient",
    "focusRange 精确框住生词",
  );
  assert(
    cards[1].type === "weak_phoneme" &&
      cards[1].focus === "θ" &&
      cards[2].focus === "v",
    "第 2-3 卡 = 弱音狙击 θ/v",
  );
  assert(
    cards[3].type === "micro_scene" && cards[3].sceneid === "s9",
    "末卡 = 今日微剧场",
  );
  const empty = curatorCore.assemblePrescription({
    dueVocab: [],
    clipsByWord: {},
    weakPhonemes: [],
    clipsByPhoneme: {},
    scene: null,
  });
  assert(
    empty.cards.length === 0 && empty.partial === true,
    "全空 → 0 卡 partial",
  );
}

console.log(
  "━━━ 五、studio-generate.service（DI mock）：门禁 / 降级 / happy path ━━━",
);
{
  const { createStudioGenerateService, _resetStudioRateLimit } = studioMod;
  const db = { paths: [], items: [] };
  const clipRow = (id, word) => ({
    clipid: id,
    episodeid: "ep" + id,
    enText: `We need to ${word} the timeline`,
    zhText: "我们需要延期",
    startTime: 10,
    endTime: 18,
    duration: 8,
    wpm: 120,
    cefrLevel: "B2",
    coverUrl: null,
    sourceLabel: "面试官",
  });
  const llmResponses = [];
  let llmCall = 0;
  const deps = {
    prisma: {
      corpus_clips: {
        findMany: async ({ where }) => {
          // 模拟召回：where.OR 任一 contains 命中即返回
          if (!where || !where.OR) return [];
          const hit = (kw) =>
            ["push", "back", "timeline", "delay"].some((w) => kw.includes(w));
          const matched =
            where.OR.filter((c) => c.enText || c.zhText).length > 0;
          return matched
            ? ["c1", "c2", "c3", "c4", "c5", "c6", "c7"].map((id) =>
                clipRow(id, "push"),
              )
            : [];
        },
      },
      vocabulary: {
        findMany: async () => [{ word: "resilient" }],
      },
      learning_paths: {
        create: async ({ data }) => {
          const pathid = db.paths.length + 1;
          db.paths.push({ pathid, ...data });
          return { pathid };
        },
      },
      learning_path_items: {
        createMany: async ({ data }) => {
          db.items.push(...data);
          return { count: data.length };
        },
      },
    },
    isPremium: async () => deps.premium,
    callLlm: async () => {
      llmCall++;
      // 第 1 次调用 = 意图解构；第 2 次 = 精选编排
      return llmCall % 2 === 1
        ? JSON.stringify({
            intentSummary: "委婉解释项目延期",
            searchKeywordsEn: ["push back", "timeline"],
            searchKeywordsZh: ["延期"],
            targetCefr: "B2",
            curatorIntro: "为你挑了六句既坦诚又留余地的表达",
          })
        : JSON.stringify(
            ["c1", "hack99", "c2", "c3", "c4", "c5", "c6"].map((id) => ({
              clipid: id,
              note: "注意第 3.2 秒的 push back",
              question: "主播用了哪个词组代替 delay？",
            })),
          );
    },
    premium: true,
  };
  const service = createStudioGenerateService(deps);

  // 会员门禁
  _resetStudioRateLimit();
  deps.premium = false;
  const gate = await service.generate("u1", "USER", {
    prompt: "下周要解释项目延期",
  });
  assert(
    !gate.ok && gate.code === "PREMIUM_REQUIRED",
    "免费用户 → PREMIUM_REQUIRED（403 语义）",
  );
  deps.premium = true;

  // 空心愿
  const invalid = await service.generate("u1", "USER", { prompt: "   " });
  assert(
    !invalid.ok && invalid.code === "INVALID_PROMPT",
    "空白心愿 → INVALID_PROMPT",
  );

  // happy path
  const okRun = await service.generate("u1", "USER", {
    prompt: "下周要和国外团队解释项目延期",
    includeDueVocab: true,
  });
  assert(
    okRun.ok && okRun.cards.length === 6,
    "happy path：精选 6 卡（白名单外的 hack99 被剔除）",
  );
  assert(
    !okRun.cards.some((c) => c.clipid === "hack99"),
    "LLM 编造 clipid 被白名单过滤",
  );
  assert(
    okRun.cards.every((c) => c.note && c.question),
    "每卡带点睛批注与微互动题",
  );
  assert(
    db.paths.length === 1 && db.paths[0].pathName.startsWith("心愿卡册 ·"),
    "落库 learning_paths（心愿卡册）",
  );
  assert(
    db.items.length === 6 &&
      db.items.every(
        (it) => it.clipId && it.episodeid && typeof it.order === "number",
      ),
    "条目携带新增列 clipId + 兼容列 episodeid（网页版零感知）",
  );
  assert(
    db.items.every(
      (it) =>
        typeof it.clipNote === "string" && typeof it.clipQuestion === "string",
    ),
    "条目落库 clipNote/clipQuestion（蒙太奇点睛批注，T3.2 可空列）",
  );

  // 频率限制（15s 冷却）
  const cooled = await service.generate("u1", "USER", { prompt: "再许一个愿" });
  assert(
    !cooled.ok && cooled.code === "RATE_LIMITED",
    "冷却期内 → RATE_LIMITED（429 语义）",
  );

  // LLM 失败降级
  _resetStudioRateLimit();
  const failDeps = {
    ...deps,
    isPremium: async () => true,
    callLlm: async () => {
      throw new Error("down");
    },
  };
  const llmDown = await createStudioGenerateService(failDeps).generate(
    "u2",
    "PREMIUM",
    { prompt: "深夜迷茫想听平静的话" },
  );
  assert(
    !llmDown.ok && llmDown.code === "LLM_UNAVAILABLE",
    "LLM 失败 → LLM_UNAVAILABLE（503 语义，小程序降级承接）",
  );

  // 语料不足
  _resetStudioRateLimit();
  const emptyDeps = {
    ...deps,
    isPremium: async () => true,
    prisma: { ...deps.prisma, corpus_clips: { findMany: async () => [] } },
  };
  const noMatch = await createStudioGenerateService(emptyDeps).generate(
    "u3",
    "PREMIUM",
    { prompt: "量子力学英语" },
  );
  assert(
    !noMatch.ok && noMatch.code === "NO_MATCH",
    "召回不足 → NO_MATCH（422 语义）",
  );
}

console.log(
  "━━━ 六、clip-attach.core（T1.3-4：既有响应的 additive 切片装饰） ━━━",
);
{
  const { attachClipAudio, buildClipAttachIndex, buildClipRowsWhere } =
    attachMod;
  const signCalls = [];
  const sign = async (key, expire) => {
    signCalls.push({ key, expire });
    if (key.includes("broken")) throw new Error("sign fail");
    return `https://signed/${key}?e=${expire}`;
  };

  const rows = [
    {
      clipid: "cA",
      subtitleId: 10,
      startTime: 100,
      endTime: 108,
      clipAudioKey: "yuanlu/clips/cA.mp3",
    },
    {
      clipid: "cB",
      subtitleId: 11,
      startTime: 200,
      endTime: 212,
      clipAudioKey: null,
    },
    {
      clipid: "cC",
      subtitleId: 12,
      startTime: 300,
      endTime: 308,
      clipAudioKey: "broken/cC.mp3",
    },
  ];

  // 索引构建
  const idx = buildClipAttachIndex(rows);
  assert(
    idx.size === 3 && idx.get(10).clipid === "cA",
    "索引：subtitleId → 切片行",
  );

  const items = [
    { subtitleId: 10, en: "hit cached" },
    { subtitleId: 11, en: "hit uncached" },
    { subtitleId: 99, en: "no clip" },
    { subtitleId: null, en: "null key" },
    { subtitleId: 12, en: "sign broken" },
  ];

  const out = await attachClipAudio(items, rows, sign, (i) => i.subtitleId);

  assert(
    out[0].clipId === "cA" &&
      out[0].clipAudioUrl === "https://signed/yuanlu/clips/cA.mp3?e=3600",
    "缓存命中：clipId + 签名直链（默认 1h）",
  );
  assert(
    near(out[0].clipOffset, 99.75) && near(out[0].clipDuration, 8.6),
    "对齐协议：clipOffset=start-0.25 / clipDuration=end+0.35-start+0.25（与网关同口径）",
  );
  assert(
    out[1].clipId === "cB" &&
      out[1].clipAudioUrl === undefined &&
      out[1].clipOffset === undefined,
    "未缓存：仅 clipId，零签名零转码（客户端走 /api/clips/{id}/audio 懒取）",
  );
  assert(
    JSON.stringify({ ...out[2] }) === JSON.stringify(items[2]) &&
      out[2] === items[2],
    "未命中条目：引用不变、零字段追加（既有消费方零感知）",
  );
  assert(out[3] === items[3], "key 为 null：原样返回");
  assert(
    out[4].clipId === "cC" &&
      out[4].clipAudioUrl === undefined &&
      near(out[4].clipOffset, 299.75),
    "签名失败：url 缺省但偏移/时长仍在，不抛错",
  );
  assert(
    signCalls.length === 2 && signCalls.every((c) => c.expire === 3600),
    "签名仅对缓存行发起（未命中/未缓存/懒取路径零调用）",
  );

  // 自定义过期 + 自定义 keyOf（practice-data 的字幕条目以 id 为键）
  signCalls.length = 0;
  const byId = await attachClipAudio(
    [{ id: 10 }, { id: 99 }],
    rows,
    sign,
    (i) => i.id,
    { expireSec: 120 },
  );
  assert(
    signCalls.length === 1 &&
      signCalls[0].expire === 120 &&
      byId[0].clipId === "cA",
    "keyOf 自定义（subtitles.id）+ 自定义 expireSec",
  );

  // where 构造：跨剧集分组去重 + 脏数据丢弃
  const where = buildClipRowsWhere([
    { episodeid: "e1", subtitleId: 1 },
    { episodeid: "e1", subtitleId: 1 },
    { episodeid: "e2", subtitleId: 7 },
    { episodeid: "", subtitleId: 9 },
    { episodeid: "e3" },
  ]);
  assert(
    where.OR.length === 2 &&
      where.OR[0].episodeid === "e1" &&
      where.OR[0].subtitleId.in.length === 1 &&
      where.OR[1].episodeid === "e2" &&
      where.OR[1].subtitleId.in[0] === 7,
    "where 构造：按剧集分组、subtitleId 去重、空 episodeid/缺 subtitleId 丢弃",
  );
  assert(
    buildClipRowsWhere([]) === null &&
      buildClipRowsWhere([{ episodeid: "e", subtitleId: 3 }]).OR.length === 1,
    "where 构造：空输入 null / 单集单句可用",
  );
}

console.log(
  "━━━ 七、decoratePathItemsWithClips（T3.2 路径详情蒙太奇附加） ━━━",
);
{
  const { decoratePathItemsWithClips } = attachMod;
  const clipRows = [
    {
      clipid: "cA",
      enText: "push back the timeline",
      zhText: "推迟时间线",
      startTime: 10,
      endTime: 18,
      duration: 8,
      wpm: 120,
      cefrLevel: "B2",
      coverUrl: "cvA",
      sourceLabel: "访谈",
    },
    {
      clipid: "cB",
      enText: "a bit of a stretch",
      zhText: "有点勉强",
      startTime: 30,
      endTime: 38,
      duration: 8,
      wpm: 130,
      cefrLevel: "B2",
      coverUrl: null,
      sourceLabel: null,
    },
  ];
  const items = [
    {
      id: 1,
      episodeid: "ep1",
      clipId: "cA",
      clipNote: "n1",
      episode: { title: "E1" },
    },
    { id: 2, episodeid: "ep2", clipId: "ghost" },
    { id: 3, episodeid: "ep3", clipId: null, episode: { title: "E3" } },
  ];
  const out = decoratePathItemsWithClips(items, clipRows);
  assert(
    out[0].clip &&
      out[0].clip.clipid === "cA" &&
      out[0].clip.enText === "push back the timeline",
    "携带 clipId 且行存在 → 附 clip 切片行（enText/wpm/cefr 齐备）",
  );
  assert(!("clip" in out[1]), "clipId 指向缺失行 → 不附 clip（防御）");
  assert(
    !("clip" in out[2]) && JSON.stringify(out[2]) === JSON.stringify(items[2]),
    "普通剧集条目 → 零字段追加（网页版零感知）",
  );
  assert(
    decoratePathItemsWithClips([], clipRows).length === 0 &&
      decoratePathItemsWithClips(items, []).every((o) => !("clip" in o)),
    "空 items / 空切片行 → 全部原样",
  );
}

console.log("----------------------------------------");
if (failed === 0) {
  console.log("ALL CORPUS ATOMIZATION TESTS PASSED");
} else {
  console.error(failed + " TEST(S) FAILED");
  process.exitCode = 1;
}
