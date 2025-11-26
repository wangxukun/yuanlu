// 定义接受上传字幕的接口
export interface UploadSubtitlesResponse {
  status: number;
  message: string;
  subtitleUrl: string;
  subtitleFileName: string;
}

// 定义已上传文件的接口
export interface UploadedSubtitleFile {
  language: string;
  fileName: string;
  response: UploadSubtitlesResponse;
}
