---
name: create-commit
description: Stage, group, and commit changes using Conventional Commits, then push to origin. Use when the user asks to commit, save work to git, push changes, or prepare a branch for a pull request. Handles logical commit grouping, protected branch safety, and monorepo-specific exclusions.
---

# Create Commit

Autonomously stage, commit, and push changes following this repo's Conventional Commits style. Do not ask for confirmation unless there is nothing to commit or a safety rule blocks progress.

## Repo conventions

| Item | Value |
|------|-------|
| Remote | `origin` → `amplifica-oficial/merlin-fork` |
| Dev branch | `next` (integration) |
| Prod branch | `main` (production) |
| Protected | `next`, `main` — never commit directly, never force push |
| Branch naming | `<type>/<short-slug>` (e.g. `feat/landing-carousel`) |
| Commit format | `type(scope): imperative message in lowercase` |

**Commit types used in this repo:** `feat`, `fix`, `docs`, `refactor`, `chore`, `build(deps)`.

**Scope examples:** `web`, `api`, `forms`, `puck-config`, `landing-pages`, `marquee`.

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Gather git context
- [ ] Step 2: Ensure feature branch
- [ ] Step 3: Group changes logically
- [ ] Step 4: Stage and commit each group
- [ ] Step 5: Push to origin
```

### Step 1: Gather git context

Run in parallel:

```bash
git status
git diff
git diff --staged
git branch --show-current
git log -10 --pretty=format:'%s'
```

Use `git log` output to match existing commit style. If the user already specified a commit message, use it as a starting point.

### Step 2: Ensure feature branch

If current branch is `next` or `main`:

1. Derive `<type>` and `<slug>` from the primary change (e.g. `feat/landing-carousel`).
2. Create and switch: `git checkout -b <type>/<slug>`.
3. Never commit directly on protected branches.

If already on a feature branch, continue.

### Step 3: Group changes logically

Analyze all changed files and split into **focused commit groups**. One commit per coherent unit of work.

**Group by:**

- Change type (feature vs fix vs docs vs refactor)
- Scope/module (`apps/web`, `apps/api`, `packages/db`, etc.)
- Logical feature area (e.g. all Puck blocks together, all API routes together)

**Rules:**

- Many files or unrelated changes → **multiple commits**, not one giant commit.
- Each group should be independently understandable.
- Keep dependency order: types/schema before code that uses them; shared packages before apps.

**Never stage:**

- `.env`, `.env.*` (except `.env.example`)
- Credentials, secrets, API keys
- Build artifacts: `apps/*/.next/`, `node_modules/`, `.turbo/`
- IDE/OS junk: `.DS_Store`, `*.log` (unless intentionally part of the change)

### Step 4: Stage and commit each group

For each group:

```bash
# Stage only files in this group
git add <file1> <file2> ...

# Commit with HEREDOC (required for formatting)
git commit -m "$(cat <<'EOF'
type(scope): short imperative summary

Optional body when the why is not obvious from the summary.
EOF
)"
```

**Message rules:**

- English, lowercase, imperative mood
- Subject line only unless context is needed
- `type(scope):` prefix required
- Scope = primary module or component affected
- Match repo history style from Step 1

After each commit, run `git status`. Repeat Steps 3–4 until all relevant changes are committed.

**If nothing to commit:** report clean working tree and stop.

### Step 5: Push to origin

```bash
git push -u origin HEAD
```

Report: branch name, number of commits created, push result.

## Grouping examples

**Good — two focused commits:**

```
Group 1: apps/web/src/components/puck/magicui/marquee/*
         → feat(marquee): add marquee component with customizable review cards

Group 2: apps/web/src/lib/puck/config.tsx
         → feat(puck-config): register marquee block in landing page editor
```

**Bad — one bloated commit:**

```
feat(landing): add marquee, update puck config, fix css, update docs, bump deps
```

## Git safety rules

**Never:**

- `git push --force` or `git push --force-with-lease` on any branch
- `git reset --hard`
- `git clean -fd` without explicit user request
- Modify `git config`
- Skip hooks (`--no-verify`)
- Commit on `next` or `main` directly

**Amend only when ALL are true:**

- Commit was created in the current session
- Commit has NOT been pushed
- User explicitly asked to fix the last commit, OR you just committed and need to fix an immediate mistake

Otherwise create a new commit.

## Output format

After completing, report:

```markdown
## Commits created

1. `feat(scope): message` — N files
2. `fix(scope): message` — N files

**Branch:** feat/my-feature
**Pushed:** origin/feat/my-feature
```

If blocked (no changes, protected branch issue, push failure), explain what happened and the next step.
