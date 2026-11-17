# 四仓文档巡检记录

核对日期：2026-11-17。依据当前工作区代码、配置和测试；本轮只修改文档，没有部署、迁移、写业务数据库、发信或改功能代码。

## 范围与结果

初始清单为 **101 个第一方文件（68 份 Markdown、33 份文本，包含 Git 忽略与本地文件）**，排除 node_modules、构建/IDE 产物与第三方文档。逐仓结果：

| 仓库           | 初始文件 | 修订 | 删除 | 原样保留 |
| -------------- | -------: | ---: | ---: | -------: |
| yuanlu         |       80 |   16 |   11 |       53 |
| yuanlu-weapp   |       12 |    5 |    7 |        0 |
| yl-weapp       |        5 |    5 |    0 |        0 |
| yuanlu-android |        4 |    3 |    1 |        0 |
| 合计           |      101 |   29 |   19 |       53 |

另新增 7 份导航/说明：三端仓库 README，yuanlu/docs 的 MEMBERSHIP/BACKLOG/本报告，以及本地 .local/README。原有 yuanlu README 同步重写。

删除中 6 份是 Git 跟踪的旧计划，13 份是忽略的本地历史文档；本地删除同样完成，不能仅靠 git diff 查看。原文件已在临时目录备份：`C:/Users/wangx/AppData/Local/Temp/yuanlu-doc-audit-20261117/`（含 inventory.json）；它不是长期文档入口。

常用指南/计划（排除 .local 历史证据与 .txt 原始数据）由8,849行收敛至约1,233行，包含新增索引与本报告。

## 主要失真与纠正证据

| 旧说明                                             | 当前代码依据 / 修正                                                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Web 中间件是 middleware.ts；各层已严格解耦         | proxy.ts + routes.ts；core/auth/guard.ts 尚含 Next 请求适配，部分旧路由直接 Prisma。保留分层规范但不虚构迁移完成。               |
| PREMIUM role 足以授权、学新月池20次                | guard.isPremiumUser 认 ADMIN/有效订阅；lib/quota.ts 和 speech-evaluate.service.ts 为跨入口日池5+1。                              |
| Redis 保存并删除短信验证码、CustomAuthError 仍在用 | aliyun-sms.client.ts 外部校验；Redis 只计数；auth.ts 使用 custom_auth_error Cookie。                                             |
| 所有评测明细进 OSS、免费行也保存完整媒体           | saveSpeechResultCore 会员媒体/DB detailJson；免费分数/音素统计与即时响应，保留数据库行。                                         |
| 网关永远 MP3；overlap/cut/hash 尚待实现            | clip-slice.core.ts + clip-audio.service.ts 默认 AAC/ADTS；clip-core.ts 已有窗口裁剪/指纹，存量回填脚本已存在。                   |
| 查询向量尚未选型、全流程 Python 已落地             | query-embed.core.ts 已接 SiliconFlow/BGE-M3、FLAG与失败回退；标注/灌向量当前主要为TS，规划的全量响度/预切片未全部落地。          |
| 生产小程序仍纯词典首页/特训；整集下载仍可用        | app.json 当前原声工坊/微流/复习/我的；旧目录/后台内核/下载模块退役。                                                             |
| 小程序音频全部只经切片网关、字幕接口绝对禁用       | test-compliance-redlines.js 与 episode-context.js 已保留11月15日原声语境例外：整集源URL+真实字幕窗。删除“全为短文件”的错误承诺。 |
| 主页接力/日榜全 mock，连胜由网站收听达标           | 两端 pages/home/\*-api.js 已有真实分支/模拟回落；dashboard 与 core/streak 使用独立 weapp_streak_log，并支持手动点亮。            |
| 跟读84.9不会因取整达标                             | 两端 shadowing.resultView 先Math.round再比较85；旧断言与当前代码冲突，后台原始分口径需另行统一。                                 |
| yl-weapp npm test 可验证原生工程                   | package.json 只echo；另有React/Express原型与真实原生工程，端点、数据与验证要分别说明。                                           |
| Android M4待启动、收藏/历史/路径后端仍缺失         | feature/favorites、history、learningpath 与 ContentApi 已存在；无RoomDatabase/DAO，不能把依赖声明当离线实现。                    |
| 全部测试已通过、已上线、必过审                     | 旧版本验收/部署/审核不能外推，改为本次结果、需现场核对的配置与明确设备边界。                                                     |

## 逐文档处置

### yuanlu

| 原文档                                                           | 处置 | 依据 / 去向                                                         |
| ---------------------------------------------------------------- | ---- | ------------------------------------------------------------------- |
| `ALIYUN_PHONE.md`                                                | 修订 | 纠正验证码存储/核销、自定义错误、频控计时与缺配置放行说明           |
| `ANDROID.md`                                                     | 删除 | Web 仓中的原始 Android 草案已被 Android 仓现状索引取代              |
| `CLAUDE.md`                                                      | 修订 | middleware→proxy；会员事实、API 鉴权、测试/部署与真实分层边界       |
| `DAILY-CHALLENGE.md`                                             | 修订 | 补双小程序、evaluation 明细、正式题/加练与实际迁移约束              |
| `LOCAL-ENVIRONMENT.md`                                           | 修订 | 保留硬件/模型历史快照，移除已删除文档死链                           |
| `PROGRESS.md`                                                    | 修订 | 去掉重设计流水；保留 token、字体、组件、时间轴与安全区约定          |
| `README.md`                                                      | 修订 | 补充运行、检查、四仓分工及业务代码索引                              |
| `VOICE-EVALUATION.md`                                            | 修订 | 统一日池；免费/会员保存差异、DB 明细、媒体保留与桶规则核实          |
| `yuanlu-membership-audit-final.md`                               | 删除 | 旧角色放行/双池/漏洞结论混杂历史，现行事实并入 docs/MEMBERSHIP.md   |
| `yuanlu-membership-audit-report.md`                              | 删除 | 旧会员审计重复，且含失效本机绝对链接                                |
| `会员系统重构开发任务清单.md`                                    | 删除 | 已完成重构流水与旧配额，保留事实并入会员索引                        |
| `报告审阅与优化补充意见.md`                                      | 删除 | 对旧会员方案的评审，不再作为当前实现指南                            |
| `语料工厂任务清单.md`                                            | 修订 | AAC、cut/hash 已实现；TS 标注/向量/融合现状与未实现工作分离         |
| `.agent/rules/global-persona.md`                                 | 修订 | 保留语言/复用/验证规则，移除特定工具依赖                            |
| `.agent/rules/structure.md`                                      | 修订 | 保留分层目标，明确存量 Next 适配/直接 DB/响应差异                   |
| `.agent/skills/batch-upload-audio/SKILL.md`                      | 修订 | 归集复制/新 OSS key/仅删旧 MP3/部分成功边界                         |
| `.agent/skills/batch-upload-json-subtitles/SKILL.md`             | 修订 | 6 位日期；实际只按标题匹配；已有 JSON 跳过；完整 OSS 前缀           |
| `.agent/skills/git-flow-develop/SKILL.md`                        | 保留 | 有效 Git 工作流，未修改授权/分支/冲突/禁止 force 规则               |
| `.agent/skills/universal-git-flow/SKILL.md`                      | 保留 | 有效 Git 工作流，未修改授权/分支/冲突/禁止 force 规则               |
| `.agents/skills/corpus-annotate/SKILL.md`                        | 修订 | 并发/重复键、场景 temperature、落库字段与向量失效边界               |
| `.agents/skills/corpus-ingest/SKILL.md`                          | 修订 | 增量筛选、重建删除、向量 NULL 与文本变更边界                        |
| `.zcode/plans/plan-sess_13d207fe-7214-415b-8d91-08a44ea88ada.md` | 删除 | 旧施工计划；已有实现见 README，SEO/邮件剩余事项并入 docs/BACKLOG.md |
| `.zcode/plans/plan-sess_1aefda6f-4f52-4980-ba96-20862e02674d.md` | 删除 | 旧施工计划；已有实现见 README，SEO/邮件剩余事项并入 docs/BACKLOG.md |
| `.zcode/plans/plan-sess_2b1853b1-71cd-482f-b51d-05d310cf2372.md` | 删除 | 旧施工计划；已有实现见 README，SEO/邮件剩余事项并入 docs/BACKLOG.md |
| `.zcode/plans/plan-sess_8c415b91-b093-4ca0-8986-0b3cb1c64271.md` | 删除 | 旧施工计划；已有实现见 README，SEO/邮件剩余事项并入 docs/BACKLOG.md |
| `.zcode/plans/plan-sess_abf8f548-a9ec-41e6-945d-c842510b8883.md` | 删除 | 旧施工计划；已有实现见 README，SEO/邮件剩余事项并入 docs/BACKLOG.md |
| `.zcode/plans/plan-sess_acefc9ba-b99f-4738-b520-4ae8daf4664a.md` | 修订 | 保留原有未跟踪计划正文，顶部标明已实现，避免重复建表                |
| `.zcode/plans/plan-sess_c1ed8116-e7f1-47bc-8a8d-6c400c56c5f8.md` | 删除 | 旧施工计划；已有实现见 README，SEO/邮件剩余事项并入 docs/BACKLOG.md |
| `scripts/tmp-mp3-backup-20260924.txt`                            | 保留 | 音频/对象迁移原始数据或口播源资产，不是待执行开发文档               |
| `scripts/outro-template/口播.txt`                                | 保留 | 音频/对象迁移原始数据或口播源资产，不是待执行开发文档               |

### yuanlu-weapp

| 原文档                                | 处置 | 依据 / 去向                                                      |
| ------------------------------------- | ---- | ---------------------------------------------------------------- |
| `Android-Meterial.md`                 | 修订 | 去掉过期数量/替换台账，保留 Material 来源、SVG/PNG/深色/命名规范 |
| `COMPANION-DESIGN.md`                 | 修订 | 更新四 Tab、真数据与原声语境窗口例外，删除旧提审保证             |
| `DOWNLOAD-TASK.md`                    | 删除 | 整集下载已退役，不再保留该功能实施计划                           |
| `PROFILE-TASK.md`                     | 删除 | 已完成个人资料复刻，规范/入口并入 WE-TASK/README                 |
| `Relay_Module_Tasks.md`               | 修订 | 保留 T12/T13/T5 与可选项，已完成交互改为现状                     |
| `RESHAPE-AUDIT.md`                    | 修订 | 发布检查匹配当前静态门禁和动态文案/字幕例外                      |
| `RESHAPE-TASK.md`                     | 删除 | 旧去整集绝对约束与文案保证被最新边界取代                         |
| `REVIEW-TASK.md`                      | 删除 | 已完成阶段和旧整集/双池内容，规则/入口并入 WE-TASK/README        |
| `SENTENCE-SRS-TASK.md`                | 删除 | 已实现 SRS 的施工流水，保留算法/接口入口                         |
| `SUBSCRIBE-TASK.md`                   | 删除 | 支付施工流水与历史配置声明，当前链路/发布检查已有入口            |
| `WE-TASK.md`                          | 修订 | 以协作/组件规则替代复刻进度，区分两仓职责与测试入口              |
| `.zcode/plans/compliance-refactor.md` | 删除 | 早期纯词典首页/新 drill 页面提案已被现架构替代                   |

### yl-weapp

| 原文档                        | 处置 | 依据 / 去向                                                      |
| ----------------------------- | ---- | ---------------------------------------------------------------- |
| `Android-Meterial.md`         | 修订 | 去掉过期数量/替换台账，保留 Material 来源、SVG/PNG/深色/命名规范 |
| `WE-TASK.md`                  | 修订 | 以协作/组件规则替代复刻进度，区分两仓职责与测试入口              |
| `docs/studio-dashboard.md`    | 修订 | 连胜独立数据源，真实/模拟分支、配置与失败边界                    |
| `docs/studio-shadowing.md`    | 修订 | 当前先取整再按85达标，与旧断言/后台统计区别                      |
| `docs/studio-smart-review.md` | 修订 | 保留队列/SRS/保存/原声/竞态；去掉旧抽样数字与全绿承诺            |

### yuanlu-android

| 原文档                                                           | 处置 | 依据 / 去向                                                     |
| ---------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| `ANDROID.md`                                                     | 修订 | 现有模块/导航/数据流，删除M4待启动、Room已实现等误导            |
| `UI-TASK.md`                                                     | 修订 | 合并同类 UI 候选，去过期行号/计数，保留未实现能力与有效组件目标 |
| `.zcode/plans/plan-sess_130ef29b-7473-4b41-b68e-c9883341a92c.md` | 删除 | 发现页旧施工方案，入口/组件规范已合并 Android 文档              |
| `docs/BEIAN.md`                                                  | 修订 | 包名核对；保留历史公开指纹，说明当前签名未重算                  |

### 本地评测与原始证据

yuanlu/.local/ 初始50份文档/文本中，修订 eval/README 1份，其余49份保留：人工 rubric、检索/值得学/边界实验报告、场景实验报告/复核包、运行日志与 OSS 删除 manifest。报告按其输入、模型和生成时版本阅读，不重写原始结果去迎合当前实现；.local/README 新增统一边界说明。根目录 LOCAL-ENVIRONMENT 继续作为标明日期的本机信息快照。原始文本数据/口播资产与有效 Git 工作流不删。

原有未跟踪连胜计划保留正文，只补“已实现”提示；未移除用户本地运行状态、评测金标、备份清单或 keystore。备案公开指纹仅保留历史值，本轮没有解锁私钥库重算。

## 保留的有效规则与待办

语言/复用、端云分层、DTO与跨端兼容、Material图标及SVG/PNG烘焙、主题/字体/token、WXML零方法调用、差量setData、音频互停/offset、生命周期/账号跨日隔离、SRS/会员服务端校验、人工质量门槛均已保留并附代码位置。

未完成内容继续保留：接力试听确认/撤销/动态文案及可选增强；Android主题组件与逐页UI优化、下载/队列/订阅等占位；语料倒排/RAG缓存/全量预切片响度/调度；SEO规划与邮件旧模板提醒。入口分别见各仓 README、UI-TASK、Relay_Module_Tasks、语料索引与 BACKLOG，不能将这些候选写成现有能力。

## 本次验证

- 四仓 git diff --check 通过；保留/新增指南的 Markdown 本地链接核对（包括跨仓与技能相对链接）。
- 4份改动技能通过 skill-creator/quick_validate.py。
- yuanlu-weapp npm test 完整45个脚本链通过，含读取 Android-Meterial.md 的通知断言；门禁无独立 test:compliance script，文档已改为真实 Node 命令。
- yuanlu npm run test:corpus、npm run test:daily 通过。
- yl-weapp test-daily-challenge.cjs、test-studio-smart-review.cjs 通过；test-studio-dashboard.cjs 在59行失败（请求次数3≠1），test-studio-shadowing.cjs 在61行失败（85≠84.9）。这些源码与断言本轮未改，按已存在的实现/断言差异记录，未为文档整理修改产品规则。
- 未执行生产接口探测、真实付费/录音、PostgreSQL集成迁移或 Android构建；此轮不把旧验收、自动断言或依赖声明当成设备/生产证据。

文档维护方式：入口留 README，长期规则和组件约定独立维护；任务完成后回写当前入口与行为，移除施工流水；历史数字保留在有版本的实验证据，不复制进常用代码指南。
