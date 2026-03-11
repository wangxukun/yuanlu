# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 提供本代码仓库的工作指南。

## 项目概述

远路播客 (Yuanlu Podcast) 是一个基于 Next.js 16+ 的英语播客学习平台。支持基于角色的访问控制（USER、PREMIUM、ADMIN），功能包括播客管理、剧集播放、词汇追踪、学习路径规划和语音识别练习。

## 常用命令

```bash
# 开发
npm run dev          # 启动 Next.js 开发服务器，地址 localhost:3000

# 构建
npm run build        # 生产环境构建
npm run start        # 启动生产服务器

# 代码检查与格式化
npm run lint         # 对 app/ 目录运行 ESLint
npx prettier --write --ignore-unknown .   # 格式化所有文件

# 数据库
npx prisma generate  # 修改 schema 后重新生成 Prisma 客户端
npx prisma studio    # 打开 Prisma Studio 管理数据库

# Git 工作流
npm run commit       # 使用 git-cz 进行交互式提交（约定式提交）
```

## 架构说明

### 技术栈

- **框架**: Next.js 16+ (App Router)
- **认证**: NextAuth v5 (beta) + Credentials Provider + JWT 策略
- **数据库**: PostgreSQL + Prisma ORM
- **样式**: Tailwind CSS 3.4 + DaisyUI 5
- **状态管理**: Zustand（客户端状态）+ Server Actions（数据变更）
- **文件存储**: 阿里云 OSS（头像、封面、音频文件）
- **外部 API**: 有道智云 API（翻译/词典功能）

### 路由结构

使用 Next.js App Router 路由组：

```
app/
├── (main)/              # 主布局，包含头部/底部/播放器
│   ├── home/            # 用户仪表盘
│   ├── discover/        # 播客发现页
│   ├── episode/[id]/    # 剧集详情/播放页
│   ├── podcast/[id]/    # 播客详情页
│   ├── library/         # 用户收藏/历史/词汇库
│   └── ...
├── admin/               # 管理后台（仅 ADMIN 角色）
│   ├── podcasts/        # 播客管理
│   ├── episodes/        # 剧集管理
│   └── ...
├── api/                 # API 路由
│   ├── auth/            # NextAuth 端点
│   ├── episode/         # 剧集 CRUD
│   └── ...
└── types/               # TypeScript 类型声明
```

### 认证与授权

采用 NextAuth v5 + JWT 策略：

1. **配置分离**: `auth.config.ts` 导出中间件配置，`auth.ts` 导出完整配置（含 providers）
2. **中间件** (`middleware.ts`): 基于 `routes.ts` 定义进行路由保护
3. **角色**: 三级角色 - USER、PREMIUM、ADMIN
4. **路由类型** (定义在 `routes.ts`):
   - `publicRoutes`: 无需登录（首页、发现、剧集页面）
   - `userRoutes`: 需 USER 或以上角色
   - `adminRoutes`: 需 ADMIN 角色
   - `premiumRoutes`: 需 PREMIUM 或 ADMIN 角色

### 数据层

**Prisma** 用于数据库访问：

- 模型定义: `prisma/schema.prisma`
- 客户端单例: `lib/prisma.ts`（防止开发环境多次实例化）
- 核心模型: User、user_profile、podcast、episode、vocabulary、listening_history、comments

**Server Actions** 位于 `lib/actions/`，处理数据变更：

- `favorite-actions.ts`: 收藏/取消收藏 剧集/播客
- `vocabulary-actions.ts`: 保存/删除 词汇
- `history-actions.ts`: 记录播放进度
- `learning-path-actions.ts`: 管理学习路径

**服务层** 位于 `lib/`，处理复杂查询：

- `data.ts`: 通用数据获取
- `podcast-service.ts`: 播客相关查询
- `discover-service.ts`: 发现页数据
- `admin-podcasts-service.ts`: 管理后台数据

### 文件上传

使用阿里云 OSS：

- 上传逻辑: `lib/oss.ts` - 生成带签名的 URL，浏览器直传 OSS
- 文件类型: 音频、字幕(SRT)、图片（封面、头像）
- 私有文件 URL 签名有效期 3 小时

### 核心组件

- **播放器**: `components/player/` - 音频播放器，支持字幕同步
- **控制栏**: `components/controls/PlayControlBar.tsx` - 底部播放控制条
- **布局**: `components/main/sidenav.tsx` + `components/header/Header.tsx`
- **认证弹窗**: `components/auth/` - 登录/注册对话框（全局弹窗，非页面）

### 状态管理

- **Zustand**: 依赖中包含，用于客户端状态
- **NextAuth session**: 通过 `AuthProvider` (app/AuthProvider.tsx) 管理认证状态
- **URL 状态**: 用于控制弹窗（如 `?showSignIn=true`）

## 开发注意事项

### TypeScript 配置

路径别名 (`tsconfig.json`):

- `@/*` 映射到 `./*`（项目根目录）
- `@/prisma/*` 映射到 `./prisma/*`

### 样式规范

- Tailwind + DaisyUI 主题系统
- 深色模式: `data-theme="dark"` 属性选择器
- 字体: Inter 用于界面，Lusitana 用于英文字幕（衬线体）

### 提交规范

使用约定式提交，由 commitlint 强制执行：

```
<type>(<scope>): <subject>
```

类型: feat、fix、docs、style、refactor、test、chore

### CI/CD

GitHub Actions 工作流 (`.github/workflows/ci-cd.yml`):

1. 触发条件: push 到 `master`、`develop` 或 `feature/*` 分支
2. 执行: 安装依赖、运行测试、运行 lint
3. 部署: push 到 `master` 时，通过 SSH + PM2 部署到阿里云 ECS

### 环境变量

`.env` 中需要配置：

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
OSS_REGION=oss-cn-beijing
OSS_BUCKET=...
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
EMAIL_FROM_ADDRESS=...
SMTP_PASS=...
YOUDAO_APP_KEY=...
YOUDAO_APP_SECRET=...
```
