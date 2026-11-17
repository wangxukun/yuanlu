# 会员、配额与支付索引

代码核对：2026-11-17。替代会员重构任务表和早期漏洞报告；历史“PREMIUM role 终身放行”“学新月池”描述已不适用。

## 权限事实

[core/auth/guard.ts](../core/auth/guard.ts) 的 isPremiumUser：ADMIN 直通，其余要求 subscriptions 中 PREMIUM 的 endDate 大于当前时间。role=PREMIUM 是展示缓存；[lib/premium-role.ts](../lib/premium-role.ts) 从订阅派生显示角色。auth.ts、移动鉴权和 subscription/status 各负责同步；接口仍需执行最终鉴权。

canAccessEpisode 处理专享媒体访问；stripExclusiveEpisodeMedia 统一剥离无权用户的媒体字段。是否存在专享剧集是数据库状态，不在文档宣称“全库免费”。

## 常量与入口

| 能力            | 当前免费口径 / 代码                                                   |
| --------------- | --------------------------------------------------------------------- |
| 生词            | 总 50、每日新增 5；lib/quota.ts、core/vocabulary/                     |
| 查词            | 每日 30；lib/dictionary-quota.ts、app/api/dict/                       |
| 句子            | 总 30；core/saved-sentences/、app/api/sentences/                      |
| 评测            | 全局日池 5+1；core/speech/speech-evaluate.service.ts                  |
| 弱项 / 评测历史 | 免费展示 3 条弱项、5 条历史；lib/quota.ts，具体响应在 app/api/speech/ |
| 学习路径        | 免费 1 条；core/learning-path/，生成与高级能力另有门禁                |
| 触墙承接        | components/subscription/、lib/track.ts、core/analytics/               |

配额值集中维护 lib/quota.ts，客户端提示与服务端策略同步修改；删词、删句、删路径等释放容量动作不应被新增配额拦截。

## 支付链路

- 网页爱发电：[core/afdian](../core/afdian)、[app/api/webhook](../app/api/afdian/webhook)、[lib/afdian-plans.ts](../lib/afdian-plans.ts)。回调校验、幂等、未匹配订单认领与订阅延期应查服务实现。
- 小程序虚拟支付：[core/wx](../core/wx)、[core/wxpay](../core/wxpay)、[app/api/wxpay](../app/api/wxpay)；前端位于 yuanlu-weapp/utils/wxpay.js 与 pages/subscription/。
- 订阅事实：[core/subscription](../core/subscription)、[app/api/subscription](../app/api/user/subscription)。两条支付通道复用订阅域；价格/SKU/签名环境变量查各自配置，不在文档复制密钥或运营数字。
- 自动检查使用 package.json 中 test:wxbind、test:wxpayconfig / sig / order / notify / reconcile / orders 的实际完整命令名；真实支付、推送及后台配置需要独立验证。
