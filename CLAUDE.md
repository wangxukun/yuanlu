# 仓库协作指南

先读 [README.md](README.md) 定位业务，再查调用链；命令以 package.json 为准。中文沟通，代码标识符及新增代码注释用英文。修改前检索现有 service、DTO、组件与测试，避免新增重复实现。

## 分层与兼容

- 共享业务放 core/；REST 在 app/api/，Web 表单包装在 lib/actions/。复用同一业务服务，跨端数据明确 DTO；新增移动能力同时提供 REST。
- 纯业务模块不依赖 Next.js 请求上下文或浏览器 API。现有 core/auth/guard.ts 是框架适配例外；存量路由/Actions 尚有直接 Prisma 调用，不能据此声称全仓已完成分层。新功能按 [.agent/rules/structure.md](.agent/rules/structure.md) 收敛。
- `@/*` 指向仓库根；优先别名，避免过深相对导入。
- Web Cookie 会话来自 auth.ts；API 按需求用 requireAuth / authWithMobile / requireAdmin / requirePremium（core/auth/guard.ts），逐路由核对，不能假定所有 API 都已支持 Bearer。
- 页面保护在 proxy.ts + routes.ts；`apiAuthPrefix=/api`，API 自行鉴权。会员执行判定为 ADMIN 或有效订阅，PREMIUM role 仅展示缓存，见 [会员说明](docs/MEMBERSHIP.md)。
- 三端共享数据库与接口。小程序适配优先 additive schema、可选字段与新路由；保持现有 Web 响应兼容，不擅改共享字段含义。
- 日期统计复用 core/utils/china-date.ts；网站收听打卡与小程序开口连胜是不同业务，勿互相回写。

## UI 与验证

复用 [组件与样式规范](PROGRESS.md)，精听/听写复用 components/episode/transcript/ 和现有播放器状态。浏览器或真机验证按改动影响选择；自动化断言不代替录音、播放、支付的硬件/真实服务验证。

`npm run lint` 只覆盖 app/；core/lib/components 的改动须另对相应文件执行 ESLint，并运行类型检查及相关功能测试。`npm test` 是占位，不能报告为全量测试通过。

提交采用 Conventional Commits（commitlint + Husky）。仅在用户要求提交/推送时执行相应工作流，核对 diff、限定本次文件，不夹带已有修改。部署配置和触发分支见 CI 文件，不从旧计划推断生产状态。
