---
name: universal-git-flow
description: 通用的 Git 级联合并工作流。从指定功能分支提交推送，依次合并到 develop 和 master 并推送。
---

# Universal Git Flow Skill

## Goal

将指定功能分支的代码一键同步至 develop 和 master 分支，并确保最终回到原分支。

## Parameters

- `feature_branch`: 必填。当前正在开发的功能分支名称（例如：feat/channel）。

## Instructions

1.  **环境检查**：确认当前分支是否为 `feature_branch`，并检查是否有未提交的代码。
2.  **源分支推送**：
    - `git add .`
    - `git commit -m "chore: sync from {{feature_branch}}"`（请根据实际改动微调 commit 信息）
    - `git push origin {{feature_branch}}`
3.  **合并至 develop**：
    - 切换到 `develop`：`git checkout develop`
    - 拉取最新：`git pull origin develop`
    - 执行合并：`git merge {{feature_branch}}`
    - 推送到远程：`git push origin develop`
4.  **合并至 master**：
    - 切换到 `master`：`git checkout master`
    - 拉取最新：`git pull origin master`
    - 执行合并：`git merge develop`
    - 推送到远程：`git push origin master`
5.  **收尾**：
    - 切回原分支：`git checkout {{feature_branch}}`

## Constraints

- **冲突熔断**：合并过程中若出现任何冲突（Conflict），**必须立即停止**，并高亮显示冲突文件，等待用户手动处理。
- **推送安全**：禁止使用 `--force` 推送。
