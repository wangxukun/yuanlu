# 今日挑战：每日固定选料

代码核对：2026-11-17。入口 [app/api/clips/daily-challenge/route.ts](app/api/clips/daily-challenge/route.ts)，业务 [core/clips](core/clips) 的 core/service/repo。当前 DAILY_VERSION=daily-v2；保留以下协议与部署约束，不复制历史验收流水。

## 选料与稳定性

- 独立 POST /api/clips/daily-challenge；不改 GET /api/clips/feed。登录用户按 userid + 中国自然日固定有序清单，刷新/新收藏/换设备不重选。
- 默认 5 条跨 5 集，主话题最多 2 条，生词优先最多 2 条；默认 B1/B2。发放冷却 30 天、成功评测冷却 90 天（含 learn/review、0 分），生词优先只在有界随机池内匹配。
- 每窗128行、首轮4窗、最多12窗/1536行；窗口可重叠。用稳定哈希索引取样，不用全表 random/COUNT/深 OFFSET；门禁/冷却在候选窗之后执行。
- 不足逐级放宽默认难度/多样性、练习冷却至30天、发放冷却至14/7天；显式 levels 不放宽。仍不足保存 partial/empty；sample_budget_exhausted 不等于全库枯竭。
- 句子身份为 episodeid + subtitleId，同日再按规范文本 hash 去重；不做跨节目语义近似句去重。素材下架/字幕更改/权限撤销只标不可用，保留位置不补题。

## 请求与响应

请求只接受 anonymousId、localHistory[]、levels[]，禁止客户端传 userid/date/forceReselect；body≤128KiB。游客安装 ID 为16–80位字母/数字/下划线/连字符；历史最多500条、只采纳近90天日期，subtitleId=0合法。显式无效 Authorization 且无有效会话时返回401。

响应 data：assignmentId/date/timezone/algorithmVersion/status/fallbackStage/samplingReason/items；items 包含 slot/sentenceKey/textHash/matchedWords/selectionReason/available/evaluation。evaluation 恢复当日最新评测，当前也附四维分与已保存 detailJson.words（无明细时空数组）；不是只有 id/score。音频经网关懒取，清单不存签名 URL；private,no-store，不返回种子。

## 持久化与客户端

- daily_challenge_assignment 保存 JSON 清单，UNIQUE(userid,date) + createMany/skipDuplicates 后读回胜者防首次并发发多组。随机起点由 NEXTAUTH_SECRET HMAC 派生；哈希表达式/部分索引在手写 SQL，Prisma schema 不能完整表达，后续迁移勿误删。
- 历史读取有界；评测按本轮候选键查询，不加载全用户历史。清理建议保留180天清单，非自动已实现任务；不得为回退版本删除当日清单或评测流水。
- yl-weapp 与 yuanlu-weapp 均有 pages/home/daily-challenge.js。缓存按主体/中国日期分开，游客安装ID与账号隔离；partial/empty 也缓存；刷新是刷新进度。旧缓存认领与本地历史逻辑查各端实现。
- 原生今日挑战可额外添加榜单同款加练；isBonus 项与正式每日清单/完成率分开。示例只试听，跨午夜/换号/销毁丢弃迟到结果。挑战达标显示与服务端原始分统计可能存在取整差异，见 [跟读说明](../yl-weapp/docs/studio-shadowing.md)。

## 部署与验证

迁移 [20261114150000_daily_challenge_assignment](prisma/migrations/20261114150000_daily_challenge_assignment/migration.sql) 先于后端、客户端；使用锁定 Prisma 6 migrate deploy/generate。普通 CREATE INDEX 需评估生产写锁窗口，不能把本机耗时作为 RDS 承诺。当前线上是否执行须另查，不从代码推断。

```powershell
npm run test:daily
npm run test:corpus
# 两个小程序分别执行：
node scripts/test-daily-challenge.cjs
```

真实 PostgreSQL 集成测试只在**新建隔离本机库**运行：设置 DAILY_TEST_DATABASE_URL 指向 localhost/127.0.0.1 的 daily_challenge_test，再 `npm run test:daily:postgres`。脚本不加载 .env、不清理既有表，库中已有同名表会失败；不能使用业务数据库。

排查生成计算耗时/窗口数/回退原因看 [daily-challenge.selection] 日志；并发可多次计算，发放以清单表为准。统计区分正常/回退、真实/示例；空结果单独计供给不足，不进入重合率分母。
