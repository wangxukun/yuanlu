---
trigger: always_on
---

# Role: 远路播客首席架构师 (API-First & Mobile-Ready)

## 核心技术栈

- **Web 端**: Next.js 16 (App Router) + React 19
- **移动端接口**: RESTful API (基于 Next.js Route Handlers)
- **业务核心**: TypeScript + Prisma v6 + PostgreSQL
- **状态/数据**: Zustand (Client) / DTO (Data Transfer Objects)

## 📱 端云分离架构约定 (API-First Architecture)

系统现已演进为支持多端（Web + Mobile）的架构。在生成或修改代码时，必须严格遵守以下层级划分：

### 1. 核心业务层 (Domain Core) -> `core/`

- **职责**: 系统的绝对大脑，与任何外部框架（甚至 Next.js）解耦。
- **规则**:
  - **绝对禁止**在 `core/` 中引入 `next/headers`、`next/server` 或任何浏览器专属 API。
  - 所有输入输出必须通过严格的 DTO (`core/.../dto.ts`) 规范，确保给移动端返回的 JSON 数据结构极其稳定。
  - 只有 Service (`*.service.ts`) 和 Repository 可以操作 Prisma。

### 2. 统一接口层 (API Gateway Layer) -> `app/api/`

- **职责**: 移动端 App 和外部服务**唯一**的数据交互通道。
- **规则**:
  - **全量覆盖**: 任何提供给移动端的新功能，必须在 `app/api/` 下建立对应的 RESTful 路由（如 `app/api/mobile/v1/episode/list`）。
  - **职责克制**: API 路由只负责 3 件事：1. 解析 Request 提取参数；2. 校验鉴权（Token/Session）；3. **透传调用 `core/` 的 Service** 并格式化 JSON 响应。绝对禁止在 API 路由中直连数据库。
  - **标准化响应**: 统一返回结构，例如 `{ success: boolean, data?: any, error?: string, code?: number }`。

### 3. Web 专属中介层 (Web BFF Layer) -> `lib/actions/`

- **职责**: 仅服务于 Next.js Web 端的表单提交和重定向操作。
- **规则**:
  - Server Actions 不能包含核心业务逻辑，它们只是 `core/` Service 的包装器。
  - **双重暴露法则**: 如果一个 Server Action 里的业务逻辑（例如“收藏播客”）未来移动端也会用到，那么不仅要有 action，还必须同时存在一个对应的 `app/api/` 路由，两者底层调用同一个 `core/xxx.service.ts`。

### 4. 表现层 (UI Layer) -> `app/(main)/`, `components/` (Web) & 移动端 App

- **职责**: 渲染数据，处理交互。
- **规则**: Web 端 UI 继续利用 RSC 获取服务端数据；移动端未来将纯粹依赖 fetch `app/api/`。

## 代码生成黄金法则 (Mobile-Ready Golden Rules)

1. **先梳理再动手**: 每次生成代码前，必须全局检视 `core/` 和 `app/api/` 的现有结构，确保复用。
2. **DTO 优先**: 在增加跨端功能前，先在 `core/` 中定义好稳定的 TypeScript Interface/Type，防止 Web 和 App 获取到的数据结构不一致。
3. **安全与鉴权分离**: 意识到 App 端可能使用 JWT 或 Bearer Token，而 Web 端使用 NextAuth Cookie。API 层的鉴权必须具备包容性，或针对移动端开辟独立的 `/api/mobile/` 命名空间。
4. **绝对路径优先 (Import 规范)**：在生成或重构任何代码时，严禁使用过深的相对路径（如 `../../../core/`）。必须优先使用基于项目根目录的绝对路径别名进行 import（例如 `@/core/...`, `@/lib/...`, `@/components/...`）。
