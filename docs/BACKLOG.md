# 保留的后续事项

2026-11-17 从旧计划中收敛；仅记录尚未落实或需要重新核对的工作，不代表已排期。

- SEO：当前公开布局在 app/(main)/layout.tsx，episode/podcast 页面各有 metadata。旧计划提出集中品牌常量、metadataBase/canonical/OG/Twitter、可复用 JSON-LD 与面包屑；lib/site.ts、components/seo/ 当前不存在，不能按“现有组件”调用。实施时保留多根布局结构、核对各公开页 URL 和实际结构化数据，不承诺搜索展示效果。
- Web UI token 清理见 [PROGRESS.md](../PROGRESS.md)；语料未完成环节见 [语料索引](../语料工厂任务清单.md)；小程序接力待办见 [Relay_Module_Tasks.md](../../yuanlu-weapp/Relay_Module_Tasks.md)。
- 旧邮件上线公告脚本 scripts/send-weapp-launch-email.ts 仍可供排查；模板含整集、下载等旧小程序能力描述，使用前须重审文案与当前产品边界。仅文档巡检不触发发送。默认 dry-run，--to/--send 会真实发信；防重记录 scripts/.weapp-launch-email-state.json 必须保留，勿因清理旧计划而删除运行状态。
