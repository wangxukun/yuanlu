/**
 * [P3-e] 薄弱音素专项练习建议（单一数据源）。
 *
 * 静态 IPA → 中文练习建议映射（针对中文母语学习者的高频弱音），
 * 供 AI 发音诊断报告的"专项练习建议"消费——零 LLM 成本、零网络请求，
 * 未命中映射的音素回退通用建议。服务端诊断接口与前端报告面板共用本表。
 */

export interface PhonemeTip {
  /** 要领：一句话说清发音位置/方式 */
  tip: string;
  /** 最小对比词对（体会差别用） */
  contrast: string;
}

const PHONEME_TIPS: Record<string, PhonemeTip> = {
  // ── 咬舌音：中文无对应，最高频弱音 ──
  θ: {
    tip: "舌尖轻咬上下齿之间，气流从舌齿缝隙摩擦出——不是「斯」，舌要真伸出去",
    contrast: "think vs. sink · path vs. pass",
  },
  ð: {
    tip: "与 /θ/ 同口型但声带振动，轻咬舌尖发浊音，常见于 the/this/that",
    contrast: "then vs. den · they vs. day",
  },
  // ── 唇齿音 vs 圆唇音 ──
  v: {
    tip: "上齿轻触下唇摩擦发声，不是「乌」——w 是双唇圆拢，v 要见到牙齿",
    contrast: "very vs. wary · vest vs. west",
  },
  w: {
    tip: "双唇撮圆像吹蜡烛起点，不要碰到牙齿（碰到就成了 v）",
    contrast: "wine vs. vine · wet vs. vet",
  },
  // ── l / r ──
  r: {
    tip: "舌尖卷起不触上颚，口型收圆；中文「日」的卷舌更靠前，英语 r 更松",
    contrast: "light vs. right · lace vs. race",
  },
  l: {
    tip: "舌尖抵上齿龈；词尾 l（feel/call）舌尖要真抵住，不要吞掉",
    contrast: "feel vs. fee · call vs. caw",
  },
  // ── 长短元音 ──
  iː: {
    tip: "长音拉满、嘴角向两侧咧开（微笑状），比「衣」更靠前更紧",
    contrast: "seat vs. sit · eat vs. it",
  },
  ɪ: {
    tip: "短促放松，舌位比 iː 低且靠中——不是缩短版的「衣」，是更松的音",
    contrast: "sit vs. seat · ship vs. sheep",
  },
  æ: {
    tip: "口张大、下巴下压，介于「哎」和「安」之间；胆子放大把嘴张开",
    contrast: "bad vs. bed · cat vs. ket",
  },
  e: {
    tip: "口半开、舌位中前，比 /æ/ 嘴小一半——不要滑成「哎」",
    contrast: "bed vs. bad · men vs. man",
  },
  ə: {
    tip: "schwa 最常见的英语元音：完全放松、短而含糊（about 的 a）",
    contrast: "about · banana · sofa",
  },
  ɑː: {
    tip: "口张大、舌后部压低，长音（father 的 a）——不是「阿」的扁音",
    contrast: "car vs. 卡 · heart vs. hut",
  },
  ʌ: {
    tip: "短促、口半开、完全放松（cup/bus 的 u），比「阿」嘴小且短",
    contrast: "cup vs. carp · cut vs. cart",
  },
  // ── 鼻音与后鼻音 ──
  ŋ: {
    tip: "舌后部抵软腭，走鼻子出气（sing/long 结尾）——不要读成 n（舌尖抵齿龈）",
    contrast: "sin vs. sing · thin vs. thing",
  },
  // ── 摩擦/塞擦音 ──
  ʃ: {
    tip: "双唇前突圆拢、气流摩擦（「嘘」的口型），比「西」更圆更靠后",
    contrast: "she vs. see · ship vs. sip",
  },
  tʃ: {
    tip: "t+ʃ 连发（「吃」更硬朗），气流一冲而出",
    contrast: "chair vs. share · cheat vs. sheet",
  },
  dʒ: {
    tip: "tʃ 的浊音版（jeep 的 j），声带振动",
    contrast: "jazz vs. chart · joke vs. choke",
  },
  z: {
    tip: "与 s 同口型但声带振动——中文无浊辅音，喉咙要真 buzz 起来",
    contrast: "zoo vs. sue · buzz vs. bus",
  },
  // ── 双元音（动程要足）──
  eɪ: {
    tip: "从 e 滑向 ɪ，动程要完整（late/take），不要读成单元音「诶」",
    contrast: "late vs. let · fate vs. fed",
  },
  aɪ: {
    tip: "从 a 滑向 ɪ，前半开口大（like/time），不要读成「爱」的扁音",
    contrast: "like vs. 莱克 · time vs. 泰姆",
  },
  aʊ: {
    tip: "从 a 滑向 ʊ（now/out），收尾嘴唇收圆",
    contrast: "now vs. 闹 · about vs. 额抱特",
  },
  oʊ: {
    tip: "从 o 滑向 ʊ，收尾圆唇（go/know），动程比「欧」更后",
    contrast: "go vs. 够 · so vs. 搜",
  },
};

/** 通用兜底建议（音素未命中映射时） */
const FALLBACK_TIP: PhonemeTip = {
  tip: "在跟读练习中放慢原声，对着音标口型重复 5 遍，再以正常语速连读 3 遍",
  contrast: "对比原声录音回放，逐词定位失分点",
};

export function getPhonemeTip(phoneme: string): PhonemeTip {
  // 归一化:有道返回的音素可能带斜杠或大小写差异(/θ/ → θ)
  const key = phoneme.replace(/\//g, "").trim();
  return PHONEME_TIPS[key] ?? FALLBACK_TIP;
}
