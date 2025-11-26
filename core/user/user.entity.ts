import { UserProfile } from "@/core/user-profile/user-profile.entity";

export interface User {
  userid: string; // 用户唯一标识
  email: string; // 电子邮箱
  password: string; // 密码
  role: "USER" | "ADMIN" | "PREMIUM"; // 用户角色，普通用户或管理员
  languagePreference: "zh-CN" | "en-US"; // 用户语言选择，默认为中文
  createAt: Date; // 注册日期
  updateAt: Date;
  isOnline: boolean;
  lastActiveAt?: Date; // 最后登录日期
  isCommentAllowed: boolean;
  emailVerified: Date;
  userProfile: UserProfile;
}
