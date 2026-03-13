export interface MergedSubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  textEn: string;
  textZh: string;
}

export interface ProcessedSubtitle extends MergedSubtitleItem {
  start: number;
  end: number;
}

export interface SelectionMenuState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  contextEn: string;
  contextZh: string;
}
