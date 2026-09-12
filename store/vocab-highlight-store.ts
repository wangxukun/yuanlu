import { create } from "zustand";

/**
 * 生词高亮只读镜像（对齐 yuanlu-podcast 的 vocabulary-store 驱动方式）：
 * 页面（句子本/复习页）在挂载时把服务端查询到的生词写入，
 * VocabularyHighlighter 全局读取，无需层层透传 props。
 * 真实生词本的增删仍走 vocabulary API/Action，此处仅作展示镜像。
 */

export interface VocabHighlightWord {
  word: string;
  definition?: string | null;
}

interface VocabHighlightState {
  words: VocabHighlightWord[];
  setWords: (words: VocabHighlightWord[]) => void;
}

export const useVocabHighlightStore = create<VocabHighlightState>((set) => ({
  words: [],
  setWords: (words) => set({ words }),
}));
