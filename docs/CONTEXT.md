# Context：fix/workflow-creation-event-selector

## 問題背景

上游 PR https://github.com/useplunk/plunk/pull/320 修改了 workflow **編輯頁** (`apps/web/src/pages/workflows/[id].tsx`) 的 event selector，將 `<Select>` / `<Input>` 二選一的 pattern 改成 `<Input>` + `<datalist>` 統一方式，讓使用者可以自由輸入 event name 同時有 autocomplete。

維護者 @driaug 回覆：「This change would also need to happen on the workflow creation page.」

## 根本原因

`CreateWorkflowDialog` 元件（`apps/web/src/pages/workflows/index.tsx:314-462`）的 Trigger Event 欄位仍使用舊 pattern：
- 有 tracked events 時 → 強制用 `<Select>` dropdown（第 395-407 行）
- 沒有 tracked events 時 → 才顯示 `<Input>`（第 408-417 行）

這導致使用者無法輸入尚未被 track 的 event name（如 `email.opened`）。

## 需要修復的項目

- [ ] 將 `apps/web/src/pages/workflows/index.tsx` 第 394-423 行的 Select/Input 邏輯改為 `<Input list="createEventNameSuggestions">` + `<datalist>` pattern
- [ ] 參考 `apps/web/src/pages/workflows/[id].tsx` 第 855-872 行的實作方式
- [ ] 提示文字統一改為 "Type or select from previously tracked events" 之類的描述

## 關鍵檔案

| 檔案路徑 | 說明 |
|---------|------|
| `apps/web/src/pages/workflows/index.tsx:314-462` | `CreateWorkflowDialog` 元件，需要修改 |
| `apps/web/src/pages/workflows/[id].tsx:853-872` | 已修好的 datalist pattern，作為參考 |

## 目前進度

尚未開始。需要在此 worktree 修改後，cherry-pick 或 merge 回 PR #320 的 branch。

注意：PR #320 的 upstream branch 是 `fix/custom-event-name-in-workflow`，修改完成後需要 push 到那個 branch（或直接在 upstream fork 操作）。
