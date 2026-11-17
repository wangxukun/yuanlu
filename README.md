# 远路播客 · Web 与共享后端

代码核对：2026-11-17。Next.js 16 / React 19 / Prisma 6 / PostgreSQL；具体版本以 package-lock.json 为准。

## 四仓分工

| 仓库           | 当前职责                                             | 入口                                    |
| -------------- | ---------------------------------------------------- | --------------------------------------- |
| yuanlu         | Web、管理后台及三端共用 REST API                     | 本文、[协作规则](CLAUDE.md)             |
| yuanlu-weapp   | 原声工坊、微流与复习工具小程序                       | [代码索引](../yuanlu-weapp/README.md)   |
| yl-weapp       | 原生小程序试验工程（A）+ React/Express 参考原型（B） | [开发说明](../yl-weapp/README.md)       |
| yuanlu-android | Kotlin / Compose 原生客户端，整集播放与学习          | [开发说明](../yuanlu-android/README.md) |

## 启动与检查

```powershell
npm ci
npx prisma generate
npm run dev
# 默认 http://localhost:3000
npm run lint
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

配置来自本地 .env；数据库见 [prisma/schema.prisma](prisma/schema.prisma)，服务依赖变量见对应服务源码，勿将凭据写入文档。CI 使用 Node 24。`npm test` 仅输出占位文本；按功能运行 package.json 中的 `test:*`，例如 `test:corpus`、`test:daily`、`test:wxpaynotify`。数据库集成测试的隔离要求见 [今日挑战](DAILY-CHALLENGE.md)。

## 按业务定位

| 业务                             | 代码入口                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 页面、路由保护                   | [app/(main)](<app/(main)>)、[app/admin](app/admin)、[proxy.ts](proxy.ts)、[routes.ts](routes.ts)                                                           |
| Web 登录 / 移动 Token / API 鉴权 | [auth.ts](auth.ts)、[core/auth](core/auth)、[app/api/auth](app/api/auth)                                                                                   |
| 播放、字幕、精听/听写            | [store/player-store.ts](store/player-store.ts)、[components/player](components/player)、[components/episode](components/episode)                           |
| 生词 / 句子 / 发音               | [core/vocabulary](core/vocabulary)、[core/saved-sentences](core/saved-sentences)、[core/speech](core/speech)                                               |
| 会员、配额、支付                 | [会员说明](docs/MEMBERSHIP.md)、[lib/quota.ts](lib/quota.ts)、[core/subscription](core/subscription)、[core/afdian](core/afdian)、[core/wxpay](core/wxpay) |
| 推荐、统计、连胜                 | [lib/episode-recommend.ts](lib/episode-recommend.ts)、[core/stats](core/stats)、[core/streak](core/streak)                                                 |
| 语料、检索、切片音频             | [语料索引](语料工厂任务清单.md)、[core/corpus](core/corpus)、[app/api/scenes](app/api/scenes)                                                              |
| 工坊 / 今日挑战 / 接力           | [core/studio](core/studio)、[今日挑战](DAILY-CHALLENGE.md)、[core/relay](core/relay)                                                                       |
| REST / Web Server Actions        | [app/api](app/api)、[lib/actions](lib/actions)                                                                                                             |

[UI 规范](PROGRESS.md) · [短信认证](ALIYUN_PHONE.md) · [语音评测与清理](VOICE-EVALUATION.md) · [文档巡检记录](docs/DOC-AUDIT.md)

部署行为以 [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) 为准：develop 构建后 rsync，master 在服务器拉取并构建，均用 PM2。流水线没有自动执行 Prisma migrate deploy；需要迁移的版本须单独安排，不能把构建成功当作迁移完成。
