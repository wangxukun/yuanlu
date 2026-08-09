# 阿里云短信验证码 + 图形认证 — 手机号注册登录功能任务清单

基于之前制定的实现方案，以下是该功能的所有具体开发任务。目前**所有任务均已开发并调试完成**。

## 1. 基础设施：Redis 客户端
- [x] 安装 `ioredis` 依赖
- [x] 创建 `lib/redis.ts`，配置单例 Redis 客户端并支持网络超时等错误处理

## 2. 数据库层：Prisma Schema 变更
- [x] 在 `User` 模型中新增 `phone` 字段 (带唯一约束)
- [x] 将 `User` 模型中的 `password` 字段改为可选 (为纯手机号注册做准备)
- [x] 执行数据库迁移 (`npx prisma migrate dev`)，同步表结构

## 3. 核心业务层 (Domain Core)
- [x] 封装阿里云 SMS 客户端 (`core/auth/aliyun-sms.client.ts`)，使用号码认证服务的 `SendSmsVerifyCode` 和 `CheckSmsVerifyCode` 接口，并正确传入 `schemeName` 和 `templateParam`
- [x] 封装图形认证二次校验客户端 (`core/auth/captcha.client.ts`)
- [x] 开发限流服务 (`core/auth/rate-limiter.service.ts`)，实现基于 Redis 的渐进式防刷逻辑 (按 IP 和手机号限流)
- [x] 定义相关的 DTO 数据结构 (`core/auth/sms-auth.dto.ts`)
- [x] 开发核心认证业务服务 (`core/auth/sms-auth.service.ts`)，整合验证码获取、校验及异常拦截逻辑

## 4. API 网关层
- [x] 开发发送短信 API 路由 (`app/api/auth/sms/send/route.ts`)，串联图形验证码和短信发送服务

## 5. NextAuth 认证层改造
- [x] 更新 `auth.ts` 的 `CredentialsProvider`，支持邮箱+密码及手机号+验证码的双模式验证
- [x] 扩展 `UserFromPrisma`、`jwt` 和 `session` 回调，使其跨端传递 `phone` 字段
- [x] 在 `auth.ts` 中实现手机号新用户**自动注册**逻辑 (自动生成占位邮箱以满足 Schema 要求)
- [x] 在 `auth.ts` 自定义 `CustomAuthError` 异常类，向前端精确透传“验证码错误或已过期”等中文提示

## 6. Web 前端 UI 组件
- [x] 开发图形验证码 Modal 组件 (`components/auth/captcha-modal.tsx`)，集成阿里云 H5 SDK (`ct4.js`)
- [x] 开发手机验证码表单组件 (`components/auth/phone-auth-form.tsx`)，集成 60 秒倒计时和 `CredentialsSignin` 错误渲染
- [x] 将手机号登录整合入认证对话框体系 (`components/auth/email-check-dialog.tsx`)，实现 Tab 页签无缝切换

## 7. 表单验证 Schema 更新
- [x] 在 `lib/form-schema.ts` 中新增 `phoneSignInSchema`，验证 11 位手机号格式及 6 位数字验证码
- [x] 改造前端表单提交验证规则，以支持手机号特有格式校验

## 8. 环境变量与配置
- [x] 更新 `.env`，配置阿里云 SMS 密钥 (Key, Secret, SignName, SchemeName)
- [x] 更新 `.env`，配置阿里云图形认证密钥 (AppID, AppKey)
- [x] 更新 `.env`，配置并接入公网 `REDIS_URL`
