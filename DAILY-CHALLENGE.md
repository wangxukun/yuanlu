# 今日挑战每日选料 v1

## 行为与边界

- 独立 `POST /api/clips/daily-challenge`；原 `GET /api/clips/feed` 不变。
- 登录用户按 `(userid, 中国自然日)` 固定一组有序结果。刷新、新收藏生词、重新登录、换设备和当天发版不重新选题。
- 已发放冷却 30 天；成功评测冷却 90 天，learn/review 都算，0 分也算。发放不等于真实曝光。
- 默认五条跨五集，主要话题最多两条；生词优先名额最多两条，且仅适用于未成功跟读过的句子。默认优先 B1/B2。
- 首轮四个哈希窗口，每窗最多 128 行；最多十二窗、1,536 行（窗口可能重叠）。不做全表 random、COUNT 或深 OFFSET。
- 冷却、多样性和有效词时间戳等过滤均在有界窗口之后；不会为凑五条在 SQL 内无限扫描。
- 不足时依次放宽默认难度/主题/单集上限，再放宽练习冷却到 30 天，发放冷却到 14、7 天。用户明确指定的 levels 不放宽。
- 仍不足返回 partial/empty，照样保存当天结果。采样预算耗尽仅表示 `sample_budget_exhausted`，不宣称全库枯竭。
- 下架、字幕变更、权限撤销导致卡片不可用时保留原位置，不自动换题。音频全部通过已有懒加载网关取回。
- 生词首版只在随机池中匹配，不保证每天命中。缺少字幕 ID 的历史无法可靠对应，本版不以模糊文本误排除；可另行评估精确文本回填。
- 句子身份为 `(episodeid, subtitleId)`；clipid 重新生成时仍能关联历史。同日额外按规范化文本摘要去重；不实现跨节目语义近似句识别。

## API

请求体可包含 `anonymousId`、`localHistory[]`、`levels[]`，不接受 userid/date/forceReselect。
游客 anonymousId 为 16–80 位字母、数字、下划线、连字符；登录用户身份来自 Cookie/Bearer。
localHistory 最多 500 条：`{episodeid, subtitleId, servedOn?, practicedOn?}`；subtitleId=0 合法，日期只采纳近 90 天。
请求体最多 128 KiB。显式携带无效 Bearer 返回 401，避免把游客结果保存到旧账号缓存。

响应 `data`：`assignmentId, date, timezone, algorithmVersion, status, fallbackStage, samplingReason, items`。
items 兼容 feed DTO，并附 `slot, sentenceKey, textHash, matchedWords, selectionReason, available, evaluation`。
evaluation 只提供该句当日最新成功评测的 recognitionId/score，客户端可恢复完成进度；详细词音素诊断仍使用已有评测结果。
服务端不返回 seedDigest；响应使用 `Cache-Control: private, no-store`。

## 数据与并发

`daily_challenge_assignment` 保存有序 JSON 清单；不保存音频签名 URL、不复制评测流水。
`UNIQUE(userid,date)` 和 createMany/skipDuplicates + 读回胜出记录保证多实例同时首次请求只能落一组。
随机取样使用稳定表达式索引 `(md5(episodeid || ':' || subtitleId), clipid)`，起点由 HMAC(NEXTAUTH_SECRET, 用户/安装 ID + 日期 + 版本) 派生。
表达式及部分索引位于手写 SQL，Prisma 6 schema 无法完整表达；后续生成迁移时不要误删它们。
历史最多读取该用户近 90 天的 90 行清单；评测仅按本轮候选复合键查最新一条，避免加载全量历史。

## 小程序

实现仓库为 `yl-weapp`。缓存为 `studio_daily_v2:<主体>:<中国日期>`，历史为 `studio_daily_history_v2:<主体>`。
游客使用稳定安装 ID；清缓存/换设备后不保证历史恢复。登录与游客、不同账号各自隔离。
旧版当日缓存只允许一个主体认领，保留上线当天原五条；次日自动转入新接口。
刷新按钮改为“刷新进度”；同日命中缓存不再请求选料。partial/empty 也是有效缓存。
离线时使用本地示例（七天去重，允许不足五条），当天保持不变；示例只支持试听，不计入真实语料指标。
成功评测写入本地跨天历史；账号评测仍由 speech_recognition 负责。请求跨午夜、切换账号或页面销毁后返回时丢弃。

## 上线顺序

1. 先执行本次 additive SQL 迁移，再部署含新端点的后端，最后发布小程序。
2. 服务器使用项目锁定的 Prisma 6：`npx prisma migrate deploy`，再 `npx prisma generate` 与常规构建。
3. 本次迁移含普通 CREATE INDEX，生产应安排允许短时写锁的窗口；本机测试耗时不能作为 RDS 执行耗时承诺。
4. 使用已配置的 NEXTAUTH_SECRET，不新增环境变量。不更改数据库 URL、不创建 shadow database。
5. smoke：游客和登录用户各首次请求两次、确认当日顺序一致；录音后清当天客户端缓存再获取，确认进度恢复；确认 discover 翻页不变。
6. 本次没有执行生产迁移或部署。代码回退时可保留新增表/索引，不能通过删除清单来回退，否则破坏当天稳定性。

数据保留建议 180 天。定期清理前先确认统计已归档；仅清理 `date < 中国今天 - 180天` 的清单，不删除评测流水或近期清单。本版不自动删除线上数据。

## 验证

```text
npm run test:daily
node node_modules/typescript/bin/tsc --noEmit --incremental false
node scripts/test-corpus.mjs

# 在 yl-weapp 中：
node scripts/test-daily-challenge.cjs
```

真实 PostgreSQL 集成测试必须用新建的隔离本机数据库：

```text
DAILY_TEST_DATABASE_URL=postgresql://TEST_USER@127.0.0.1:TEST_PORT/daily_challenge_test
npm run test:daily:postgres
```

脚本拒绝非 localhost/127.0.0.1 或非 daily_challenge_test 数据库，不加载 .env，不清理既有表；已有同名表时会失败。
它创建最小夹具、灌入 120k 条、执行原样 migration.sql，验证环形取样、权限过滤、0 分历史、8 路并发、跨天排除及 EXPLAIN 索引计划。

2026-11-14 本机结果：

- 回放 4 类用户 × 120 天，2,400 条，30 天发放重复=0、90 天已练重复=0，正常阶段无需回退。
- 真实 PostgreSQL 120k 夹具，8 路首次并发获得同一 assignment；索引读取 128 行，无全表排序，单窗口热缓存 EXPLAIN 约 0.4ms（不是 RDS SLA）。
- 小程序测试涵盖同日/刷新/进度恢复/partial/empty/历史/离线/换账号/跨午夜/过期认证/旧缓存迁移。
- 既有 test-studio-shadowing.cjs 在改动前已因 84.9/85 四舍五入断言失败；既有 test-studio-dashboard.cjs 在改动前已因请求数 3/1 断言失败。未更改这些无关规则。

`[daily-challenge.selection]` 输出生成计算耗时、窗口数、候选数和回退原因，不记录身份、生词或文本。并发计算会多条日志，发放统计须以清单表为准。
核心指标：30 天历史重合率（当天句子与前 30 天清单并集交集 / 当天条数）、90 天已练重合率、完整五条比例、各回退阶段占比、剧集/话题数、全库覆盖与热门句集中度。
同日读取不重复记发放；空结果不进入重合率分母，单独计供给不足率。正常与回退、真实与本地示例分别统计。
