// /types/users.ts

import { User } from "@/core/user/user.entity";

export interface VerificationCode {
  id: number;
  email: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

// 用户登录请求参数
export interface LoginRequest {
  phone: string; // 登录电话
  password: string; // 登录密码
}

// 用户登录响应数据
export interface LoginResponse {
  user: User; // 用户信息
  token: string; // JWT 令牌
}

// 用户注册请求参数
export interface RegisterRequest {
  email: string; // 注册邮箱
  username: string; // 用户名
  password: string; // 密码
  firstName?: string; // 名字（可选）
  lastName?: string; // 姓氏（可选）
}

// 用户注册响应数据
export interface RegisterResponse {
  user: User; // 注册成功的用户信息
  token: string; // JWT 令牌
}

// 用户更新资料请求参数
export interface UpdateProfileRequest {
  firstName?: string; // 更新名字（可选）
  lastName?: string; // 更新姓氏（可选）
  avatarUrl?: string; // 更新头像URL（可选）
}

// 用户更新密码请求参数
export interface UpdatePasswordRequest {
  oldPassword: string; // 旧密码
  newPassword: string; // 新密码
}

// 用户忘记密码请求参数
export interface ForgotPasswordRequest {
  phone: string; // 用户手机号
}

// 用户重置密码请求参数
export interface ResetPasswordRequest {
  token: string; // 重置密码的令牌
  newPassword: string; // 新密码
}

// 用户角色类型
export type UserRole = "USER" | "ADMIN" | "PREMIUM";

// 用户分页查询参数
export interface UserPaginationParams {
  page?: number; // 当前页码
  limit?: number; // 每页条数
  search?: string; // 搜索关键字
  role?: UserRole; // 按角色过滤
}

// 用户分页查询结果
export interface UserPaginationResponse {
  users: User[]; // 用户列表
  total: number; // 总用户数
  page: number; // 当前页码
  limit: number; // 每页条数
}

export interface userData {
  userid: string;
  email: string;
  password: string;
  role: string | null;
  emailVerified: Date | null;
  isOnline: boolean;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user_profile: {
    userid: string;
    nickname: string | null;
    avatarFileName: string | null;
    bio: string | null;
    learnLevel: string | null;
  } | null;
}
