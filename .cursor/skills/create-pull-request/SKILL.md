---
name: create-pull-request
description: Create a GitHub pull request targeting next with a Conventional Commit title and structured body. Use when the user asks to open a PR, create a pull request, or submit changes for review. Requires user confirmation before running gh pr create.
---

# Create Pull Request

Prepare and open a pull request from the current feature branch into `next`. Commit and push should already be done (use `create-commit` skill first if needed).

**Autonomy boundary:** draft the PR, present it to the user, wait for confirmation, then create. Never create a PR without explicit user approval.

## Repo conventions

| Item | Value |
|------|-------|
| Remote | `origin` → `amplifica-oficial/merlin-fork` |
| PR base | `next` (always — never target `main` directly) |
| Prod branch | `main` (production; changes reach it via release, not direct PR) |
| Protected | `next`, `main` — never force push |
| CLI | `gh` (GitHub CLI) |

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Verify gh authentication
- [ ] Step 2: Verify branch state
- [ ] Step 3: Analyze all branch commits
- [ ] Step 4: Draft PR title and body
- [ ] Step 5: Present draft and wait for confirmation
- [ ] Step 6: Create PR via gh
```

### Step 1: Verify gh authentication

```bash
gh auth status
```

If token is invalid or not logged in:

1. Stop immediately — do not attempt `gh pr create`.
2. Tell the user to run: `gh auth login -h github.com`
3. Resume only after auth succeeds.

### Step 2: Verify branch state

```bash
git branch --show-current
git status
git log next..HEAD --oneline
git diff next...HEAD --stat
```

**Checks:**

- Current branch must NOT be `next` or `main`. If it is, stop and tell the user to create a feature branch and commit first.
- Working tree should be clean. If dirty, commit or stash before proceeding.
- Ensure branch is pushed:

```bash
git push -u origin HEAD
```

### Step 3: Analyze all branch commits

Review the **full** branch diff, not just the latest commit:

```bash
git log next..HEAD --pretty=format:'%h %s'
git diff next...HEAD
```

Understand:

- What changed and why
- How many logical commits exist
- Which apps/packages are affected
- Whether there are breaking changes or migrations

Use this to write an accurate summary. A multi-commit branch should reflect all commits in the PR description.

### Step 4: Draft PR title and body

**Title:** Conventional Commit format, same as commit messages.

```
type(scope): short imperative summary
```

If the branch has a single dominant change, use that. If multiple areas, pick the primary scope or use a broader scope (e.g. `feat(landing-pages)`).

**Body template:**

```markdown
## Summary

- Bullet describing the primary change
- Bullet for secondary changes (if any)
- Mention affected apps/packages

Closes #123

## Test plan

- [ ] Specific verification step
- [ ] Another step (e.g. yarn lint, yarn build --filter=web)
- [ ] Manual test scenario
```

**Body rules:**

- English
- `## Summary` — what changed and why (bullets, not paragraphs)
- `## Test plan` — checklist of how to verify
- Reference issues with `Closes #N`, `Fixes #N`, or `Refs #N` when applicable
- Keep PR focused on one feature/fix area (per CONTRIBUTING.md)
- Do not include internal agent reasoning or tool output

### Step 5: Present draft and wait for confirmation

Show the user:

```markdown
## PR Draft

**Base:** next
**Head:** feat/my-feature

**Title:** feat(scope): short summary

**Body:**
[paste full body here]

---
Reply to confirm, or tell me what to change.
```

**STOP here.** Do not run `gh pr create` until the user confirms.

If the user requests edits, update the draft and present again.

### Step 6: Create PR via gh

After user confirmation:

```bash
gh pr create --base next --title "type(scope): short summary" --body "$(cat <<'EOF'
## Summary

- Change description

## Test plan

- [ ] Verification step
EOF
)"
```

Return the PR URL from the command output.

If a PR already exists for this branch:

```bash
gh pr view --json url,title,state
```

Report the existing PR URL instead of creating a duplicate.

## Git safety rules

**Never:**

- `gh pr create --base main` (prod is not a direct PR target)
- `git push --force` on `next`, `main`, or any branch
- `--no-verify` on any git command
- Create a PR without user confirmation
- Modify `git config`

## Output format

After creating:

```markdown
## Pull request created

**URL:** https://github.com/amplifica-oficial/merlin-fork/pull/NNN
**Title:** feat(scope): short summary
**Base:** next ← feat/my-feature
**Commits:** N
```

If blocked (auth failure, on protected branch, no commits ahead of next), explain the blocker and next step.

## Relationship to create-commit

Typical flow:

1. `create-commit` — group changes, commit, push to feature branch
2. `create-pull-request` — draft PR, confirm with user, open via `gh`

These are separate skills. Do not skip commit/push steps when opening a PR.
