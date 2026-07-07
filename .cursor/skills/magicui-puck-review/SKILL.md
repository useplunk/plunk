---
name: magicui-puck-review
description: Review a newly added Magic UI component in the Puck landing page editor for correctness, flexibility, and the project's block conventions. Use after adding or installing a Magic UI block under apps/web/src/components/puck/magicui/, or when the user asks to review/audit a new Puck block.
---

# Review a Magic UI Puck component

Audit a block in `apps/web/src/components/puck/magicui/<name>/` against the conventions and the bugs that already bit us. Reference: `apps/web/src/components/puck/magicui/marquee/`.

To add a component, use the `magicui-puck-add-component` skill. This skill only reviews.

## How to review

Read every file in the component folder plus its registration in `apps/web/src/lib/puck/config.tsx`. Walk the checklist. Report findings by severity, then run the build check.

## Severity legend

- 🔴 **Blocker** — build breaks or editor is broken. Must fix.
- 🟡 **Should fix** — convention/flexibility gap.
- 🟢 **Nice to have** — polish.

## Checklist

### 🔴 Blockers

- [ ] **CSS is a Module**: styles live in `<name>.module.css` and are imported as `styles`. No global `.css` side-effect import, no `@theme inline` / bare `@keyframes` in a component file. (Global import = Next.js build error.)
- [ ] **No `contentEditable` on array fields** in `puck-config.tsx`.
- [ ] **Not placed in `@plunk/ui`** — must be under `apps/web/.../magicui/<name>/`.
- [ ] **Registered correctly** in `config.tsx`: type entry in `LandingPageComponents`, listed in `categories.magicui.components`, and mapped in `components`.
- [ ] **`yarn tsc --noEmit` passes** from `apps/web`.

### 🟡 Should fix

- [ ] **Preview == published**: no divergent render branch on `puck.isEditing`.
- [ ] **Default arrays cloned per instance** via `createDefault<Name>()` (returns `.map(x => ({...x}))`), not a shared const.
- [ ] **React keys by index**, not by content.
- [ ] **Flexibility**: meaningful knobs are Puck fields (text, counts, colors, direction, speed, toggles) — not hard-coded. Dozens of blocks are coming; under-configured blocks are a gap.
- [ ] **Dynamic fields**: `resolveFields` hides sub-fields when their toggle is off and returns `lastFields` when nothing relevant changed.
- [ ] **Invariants enforced**: `resolveData` + a `display.ts` helper guarantee required state (e.g. at least one field visible).
- [ ] **Legacy migration**: `render` maps older saved prop shapes to the current one.
- [ ] **Folder layout matches the standard** (types / defaults / display / primitive / block / puck-config / module.css / index).
- [ ] **`index.ts` exports** the `<name>PuckComponent` and public types.

### 🟢 Nice to have

- [ ] Sensible field `label`s (human-readable in the sidebar).
- [ ] `getItemSummary` on array fields for readable item rows.
- [ ] `number` fields have `min`/`max`.
- [ ] `prefers-reduced-motion` handled for animations.
- [ ] Dark-mode classes present where the design implies it.

## Build check

```bash
cd apps/web && yarn tsc --noEmit
```

Also read lints on the component files. If a dev server is running, load the landing editor, add the block, toggle every field, and confirm the preview matches `/p/<publicId>`.

## Output format

Group findings by severity with `path:line` references and a one-line fix each. Example:

```
🔴 puck-config.tsx:42 — array field uses contentEditable: true. Remove it; edit via sidebar.
🟡 puck-config.tsx — no resolveFields; sub-fields show even when toggle off. Add dynamic fields.
🟢 marquee.module.css — no prefers-reduced-motion guard. Add one.
```

End with a short verdict: ship / fix blockers first.
