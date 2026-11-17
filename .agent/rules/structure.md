---
trigger: always_on
---

# 共享业务与端云分层

技术栈：Next.js 16 App Router / React 19 / TypeScript / Prisma 6 / PostgreSQL。Web、两套小程序与 Android 共用后端；目录索引见 [README.md](../../README.md)。

## 新增与重构时遵守

1. **core/**：共享业务、DTO、Service/Repository。纯业务模块不引入 Next.js 请求上下文或浏览器 API；数据库访问收敛到 Service/Repository。
2. **app/api/**：REST 网关解析参数、鉴权、调用业务服务、映射响应。新路由复用现有领域服务，避免直接写 Prisma/业务判断。
3. **lib/actions/**：Web 表单/重定向适配；跨端需要的能力同时提供 REST，Action 与 REST 调用同一 core 服务，不复制业务逻辑。
4. **app/(main)、components/**：表现层；RSC 可读取服务端数据，移动端走 REST。DTO 先明确可见字段、日期和时间轴单位，保持既有消费端兼容。

## 当前实现边界

- 以上是收敛约定，不表示存量已全部迁移。core/auth/guard.ts 目前含 Next.js 请求适配；部分 app/api 和 lib/actions 仍有直接数据库查询，修改时按业务边界逐步抽取，不扩大为全仓重构。
- 认证复用 core/auth/guard.ts；Web Cookie 与移动 Bearer 逐路由支持。现有 API 主要为 /api/业务名，没有统一 /api/mobile/v1 命名空间。
- 响应形状尚未全量统一；新接口优先 `{success,data?,error?,code?}`，不要为格式化文档破坏老契约。
- `@/*` 映射根目录；优先别名导入，避免 ../../../ 深相对路径。
- 共享 schema 优先 additive 迁移，保持 Web/Android 和既有小程序的字段与响应兼容；上线前分别核对迁移、部署与客户端发布。
