---
name: magicui-puck-add-component
description: Add a Magic UI component as a configurable block in the Puck landing page editor. Use when the user pastes a Magic UI (magicui.design) component, asks to add a marquee/bento/globe/etc. to Puck, or wants a new block in the landing page editor under the "Magic UI" category.
---

# Add a Magic UI component to Puck

Turn a Magic UI component into a flexible, editable Puck block for the landing page editor in `apps/web`.

Canonical reference implementation: `apps/web/src/components/puck/magicui/marquee/`. Read it before starting.

## Non-negotiable rules

These come from real bugs. Violating them breaks the build or the editor.

1. **Location**: `apps/web/src/components/puck/magicui/<name>/`. NEVER put Magic UI components in `@plunk/ui` — they are only used by Puck + landing pages, so co-locate them.
2. **CSS Modules only**: styles go in `<name>.module.css`. Next.js rejects global CSS (`@theme`, bare `@keyframes`, plain `.css` side-effect imports) outside `pages/_app.tsx`. Never import a global `.css` from a component.
3. **No `contentEditable` on array fields**. It syncs every card together and duplicates in animated (repeated-DOM) components. Edit array items in the sidebar only.
4. **Editor preview must equal published output**. Do NOT branch on `puck.isEditing` to render a different static layout — users complained the preview didn't match.
5. **Clone default arrays per instance**: `createDefault<Name>()` returns `arr.map(x => ({...x}))`. A shared mutable array leaks edits across blocks.
6. **React keys by index** (`` `row1-${index}` ``), not by content — content keys collide when items repeat.

## File structure

Mirror the marquee folder. Each file has one job:

```
components/puck/magicui/<name>/
├── types.ts            # <Name>PuckProps (+ item type, display options)
├── defaults.ts         # createDefault<Name>() -> fresh clone; DEFAULT_* export
├── display.ts          # normalize<Name>DisplayFields() — enforce invariants (optional)
├── <Primitive>.tsx     # the raw Magic UI component, using styles from the module
├── <Sub>.tsx           # any subcomponents (cards, items)
├── <Name>Block.tsx     # render wrapper — identical in editor and published page
├── puck-config.tsx     # ComponentConfig: fields, resolveFields, resolveData, render
├── <name>.module.css   # scoped animations/layout
└── index.ts            # export <name>PuckComponent + public types
```

## Workflow

```
- [ ] 1. Create folder + primitive with CSS Module
- [ ] 2. Define types + defaults (cloned)
- [ ] 3. Build the Block render wrapper
- [ ] 4. Write puck-config.tsx (fields + flexibility)
- [ ] 5. Export from index.ts
- [ ] 6. Register in lib/puck/config.tsx (3 edits)
- [ ] 7. yarn tsc --noEmit + lint
```

### Step 1 — Primitive + CSS Module

Copy the Magic UI component. Convert every animation/utility that Magic UI defined in global CSS (`@theme inline`, `@keyframes`) into a `*.module.css` file and reference via `styles.*`. Drive per-instance values (duration, gap) with inline CSS variables from props.

### Step 2 — Types + defaults

`types.ts` declares `<Name>PuckProps` (all props Puck controls). `defaults.ts` exports `createDefault<Name>()` returning a fresh clone plus sensible sample content.

### Step 3 — Block wrapper

`<Name>Block.tsx` takes `<Name>PuckProps` and renders the final markup. Same output in editor and on the page.

### Step 4 — puck-config.tsx (make it FLEXIBLE)

This is where the block earns its keep. Prioritize configurability.

- **Expose every meaningful knob as a Puck field**: text, colors, counts, toggles, direction, speed. See the Puck fields cheat sheet below.
- **Global visibility toggles**: add `show*` radios that turn parts of each item on/off (e.g. avatar/name/username/review in marquee).
- **Dynamic sidebar with `resolveFields`**: hide item sub-fields when their toggle is off. Return `lastFields` when nothing relevant changed to avoid churn.
- **Enforce invariants with `resolveData`**: e.g. "at least one text field must stay on". Put the guard in `display.ts` and reuse it in both `resolveData` and `render`.
- **Backward-compat in `render`**: map any legacy prop shape to the current one so already-saved pages don't break.
- **Fresh defaults**: `defaultProps` and static `fields` are built from `createDefault<Name>()`.

Skeleton:

```tsx
export const <name>PuckComponent: ComponentConfig<<Name>PuckProps> = {
  label: '<Name>',
  defaultProps: defaults(),
  fields: build<Name>Fields(defaults()),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = TOGGLE_KEYS.some(k => changed[k]);
    if (!toggled && lastFields) return lastFields;
    return build<Name>Fields(data.props as <Name>PuckProps);
  },
  resolveData: ({props}, {changed}) => ({
    props: {...props, ...normalizeDisplay(props, changed)},
  }),
  render: props => <<Name>Block {...migrateLegacy(props)} />,
};
```

### Step 5 — index.ts

Export `<name>PuckComponent`, helper fns, and public types.

### Step 6 — Register in `apps/web/src/lib/puck/config.tsx`

Three edits:

1. Import: `import {<name>PuckComponent, type <Name>PuckProps} from '../../components/puck/magicui/<name>';`
2. Add `<Name>: <Name>PuckProps;` to the `LandingPageComponents` type.
3. Add `'<Name>'` to `categories.magicui.components` and `<Name>: <name>PuckComponent,` to `components`.

### Step 7 — Verify

```bash
cd apps/web && yarn tsc --noEmit
```

Then check lints on the edited files. Manually confirm in the editor: add block, edit fields in sidebar, toggle visibility, verify preview matches `/p/<publicId>`.

## Puck fields cheat sheet

| Field | Use for |
|-------|---------|
| `{type: 'text'}` | short strings |
| `{type: 'textarea'}` | long text |
| `{type: 'number', min, max}` | counts, durations |
| `{type: 'radio', options}` | booleans / small enums (yes/no toggles) |
| `{type: 'select', options}` | larger enums |
| `{type: 'array', arrayFields, defaultItemProps, getItemSummary}` | lists of objects (NO contentEditable) |

`array` only supports arrays of objects. For `string[]`, wrap each value in `{value: string}`.

Prefer many small `radio`/`select`/`number` fields over hard-coded values — flexibility is the goal since dozens of these blocks are coming.

## Common pitfalls

- Global CSS import → build error `Global CSS cannot be imported from files other than your Custom <App>`. Fix: CSS Module.
- Editing one array item changes all → you left `contentEditable: true` on array fields. Remove it.
- Preview differs from live page → you rendered a different tree under `puck.isEditing`. Unify them.
- Edits bleed across blocks → shared default array. Clone it.
