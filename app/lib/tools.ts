// 时间格式化工具函数
export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

//  生成随机验证码
export const generateRandomCode = (length: number) => {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
};
