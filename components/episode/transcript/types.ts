export interface MergedSubtitleItem {
  id: number;
  start: number;
  end: number;
  speaker?: string;
  textEn: string;
  textCn: string;
  words?: { word: string; start: number; end: number }[];
}

export type ProcessedSubtitle = MergedSubtitleItem;

export interface SelectionMenuState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  contextEn: string;
  contextCn: string;
  timestamp: number;
}
