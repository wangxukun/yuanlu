---
name: git-flow-develop
description: 将当前功能分支的代码提交并推送到远程，然后合并到 develop 分支并推送，最后切回原分支（不合并 master）。
---

# Git Flow Develop Skill

## Goal

将当前工作区代码提交，并自动同步至当前分支远程和 develop 分支远程，最后确保回到当前功能分支。

## Parameters

- `commit_message`: 必填。本次提交的 commit message 信息。
- `feature_branch`: 选填。当前正在开发的功能分支名称，如果未提供应先通过 `git status` 获取。

## Instructions

1.  **环境检查**：确认当前是否有未提交的代码，确认当前所在的分支 `feature_branch`。
2.  **源分支提交与推送**：
    - `git add .`
    - `git commit -m "{{commit_message}}"`
    - `git push origin {{feature_branch}}`
3.  **合并至 develop**：
    - 切换到 `develop`：`git checkout develop`
    - 拉取最新代码：`git pull origin develop`
    - 执行合并：`git merge {{feature_branch}}`
    - 推送到远程：`git push origin develop`
4.  **收尾**：
    - 切换回原分支：`git checkout {{feature_branch}}`

## Constraints

- **冲突熔断**：合并到 `develop` 过程中若出现任何冲突（Conflict），**必须立即停止**，并高亮显示冲突文件，等待用户手动处理。
- **推送安全**：禁止使用 `--force` 推送。
- **作用域限制**：此技能**禁止**合并到 `master` 分支。如果需要同时合并到 `master`，请使用其他技能。
