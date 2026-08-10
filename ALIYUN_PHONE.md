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

## 9. 渐进式防刷限流与安全机制梳理 (基于 Redis & 阿里云)

为了保障系统免受恶意轰炸和暴力破解，我们在本套体系中构建了“自建 Redis 限流 + 阿里云底层防护”的**渐进式**多层防御体系：

### 9.1 发信频率控制 (基于 Redis `RateLimiterService`)

针对恶意调用发信接口的防御，采用维度组合（手机号 + IP）：

- **绝对冷却**：单一手机号 **60 秒内** 仅允许发送 1 次，超频直接拒绝。
- **触发人机验证**（渐进式门槛）：
  - 同一手机号 **10 分钟内** 请求 $\ge$ 3 次，强制要求先完成阿里云**图形滑动验证码**。
  - 同一 IP **1 分钟内** 请求 $\ge$ 5 次，强制要求完成**图形滑动验证码**。
- **绝对熔断**（封禁黑名单）：
  - 同一手机号 **24 小时内** 请求 $\ge$ 15 次，直接封禁，不再受理发信请求。
  - 同一 IP **1 小时内** 请求 $\ge$ 30 次，直接封禁。

### 9.2 验证阶段防暴力破解 (防爆库)

针对攻击者随意遍历 6 位数字验证码的防御：

- **失败锁定**：同一手机号在输入错误验证码**连续失败 5 次**时，立即被锁定，**30 分钟内**禁止登录及再次尝试。
- **用后即毁**：验证码校验成功后（登录成功），立即在 Redis 中执行 `del` 销毁操作（核销），防止验证码重播（Replay Attack）。
- **计数重置**：登录成功时会自动重置失败次数。

### 9.3 阿里云底层物理限流 (`biz.FREQUENCY`)

在我们的 Redis 代码防御层之下，阿里云本身的短信网关也有一套无法更改的“防骚扰”硬性限制：

- **频控上限**：单号 1条/分钟，5条/小时，10条/天。
- **降级表现**：当处于高频测试触发此限制时，阿里云 API 接口返回 `biz.FREQUENCY`。此时发信虽失败，但安全得以保障。

### 9.4 客户端提示链路保护 (Side-channel 穿透)

- **挑战**：当触发上述的防刷与封禁机制时（例如抛出“验证失败次数过多，请30分钟后再试”），NextAuth (Auth.js) v5 处于安全机制会拦截并吃掉所有自定义的 Error Message，前端只能收到统一的无意义报错（如 `Configuration`）。
- **创新解决**：在后端的 `authorize` 鉴权函数中，一旦捕获到限流错误，通过 `cookies().set` 将真实的报错信息写入生存期为 10 秒的临时 Cookie（侧信道）。前端组件检测到报错后，直接读取该 Cookie 渲染中文红字提示，并立即将其从浏览器销毁。该方案极其优雅地绕过了 Auth.js 严苛的安全隔离。
