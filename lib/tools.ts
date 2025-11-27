// 时间格式化工具函数
export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// 时间格式化工具函数
export function formatDate(date: string) {
  return new Date(date).toISOString().split("T")[0];
}

//  生成随机验证码
export const generateRandomCode = (length: number) => {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
};

//  检查邮箱
export const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * 验证密码是否符合以下规则：
 * - 长度在8到16个字符之间
 * - 至少包含以下两种字符类型：
 *   - 数字 (0-9)
 *   - 英文字母 (a-z, A-Z)
 *   - 符号 (任何非字母数字字符)
 *
 * @param password 待验证的密码
 * @returns boolean 表示密码是否有效
 */
export function validatePassword(password: string): boolean {
  // 检查长度是否符合要求
  if (password.length < 8 || password.length > 16) {
    return false;
  }
  // 初始化字符类型标志
  let hasNumber = false; // 是否包含数字
  let hasLetter = false; // 是否包含字母
  let hasSymbol = false; // 是否包含符号
  // 遍历密码中的每个字符
  for (const char of password) {
    if (/[0-9]/.test(char)) {
      hasNumber = true;
    } else if (/[a-zA-Z]/.test(char)) {
      hasLetter = true;
    } else {
      hasSymbol = true;
    }
    // 如果已经找到所有三种类型，提前退出循环
    if (hasNumber && hasLetter && hasSymbol) {
      break;
    }
  }
  // 计算包含的字符类型数量
  const typeCount =
    (hasNumber ? 1 : 0) + (hasLetter ? 1 : 0) + (hasSymbol ? 1 : 0);
  // 密码有效当且仅当包含至少两种字符类型
  return typeCount >= 2;
}
