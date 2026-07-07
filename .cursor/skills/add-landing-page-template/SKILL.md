---
name: add-landing-page-template
description: Port a Page UI (shipixen/page-ui) landing page template into the Plunk web Puck editor as nested, click-to-edit blocks. Use when adding a new landing page template, porting Page UI sections/components into Puck, or when the user mentions page-ui, front-centre, landing page templates, or Puck landing blocks.
---

# Add a Page UI Landing Page Template to Puck

Port a Page UI template (e.g. `front-centre`) from the `page-ui` repo into Plunk's web app as Puck blocks that are **click-to-edit** (click any element on the canvas selects it and opens its props) with **inline text editing** on hover.

## Architecture (two layers)

1. **Visual primitives** — `apps/web/src/components/pageui/`
   - `shared/` — `cn`, `Image` (`<img>`), `VideoPlayer`, `GlowBg`, `PageUiButton` (as `button.tsx`), `Accordion`
   - `landing/` — ported Page UI section components (`LandingTestimonial`, `LandingProductFeature`, `LandingDiscount`, `LandingRating`, `LandingSocialProof`, …)
   - These are pure React ports of page-ui. Adapt imports from `@/components/...` to local relative paths. No Puck code here.
2. **Puck wrappers** — `apps/web/src/components/puck/pageui/`
   - `elements/<name>/` — **leaves**: one Puck component per editable element (Title, Paragraph, Button, Image, Video, Award, Discount, Rating, Avatar, SocialProof, Icon, BandItem, KeyPoint, TestimonialCard, FeatureCard, FaqItem)
   - `sections/<name>/` — **containers**: one Puck component per section, exposing `slot` fields with `allow` restricting which leaves drop in
   - `front-centre/` — the **template** component: a single block whose `sections` slot is pre-populated with the full nested tree

Rule of thumb: **every element the user should be able to click = its own Puck component.** Arrays become slots of draggable leaves, never array fields.

## Prerequisites

- Page UI source available locally (e.g. `/Users/diegoazevedo/projects/page-ui`), template under `templates/landing-page-templates/template/<name>/`.
- CSS wired once (already done for front-centre): `apps/web/src/styles/pageui.css` holds Page UI tokens/utilities (`primary/secondary-*`, `container-narrow/wide`, `perspective-*`, `hard-shadow`, `fgrid`, glow, accordion keyframes). It is imported in `globals.css` (`@import './pageui.css'`) alongside `@source '../components/pageui/**/*.{ts,tsx}'`.

## Workflow

Copy this checklist:

```
- [ ] 1. Port visual primitives into components/pageui (shared + landing), fix imports, add any new CSS to pageui.css
- [ ] 2. Inventory the template: list sections and, per section, the editable elements
- [ ] 3. Create leaf components (elements/<name>/) for every editable element
- [ ] 4. Create section containers (sections/<name>/) with slots + allow
- [ ] 5. Build the template tree: createXSlotContent() + the template block (front-centre/)
- [ ] 6. Register everything in lib/puck/config.tsx (types, categories, components)
- [ ] 7. Add the preset + selector (lib/puck/templates/*, pages/landing-pages/index.tsx)
- [ ] 8. Verify: cd apps/web && yarn tsc --noEmit, then lint
```

### Step 1 — Port primitives

Copy the template's building blocks into `components/pageui/`. Keep visuals faithful; reuse `pageui.css` utilities and `pageui/shared` primitives so the ported look matches. Confirm the `@source` glob in `globals.css` covers `components/pageui/**`.

### Step 3 — Leaf component (5-file pattern)

Each leaf lives in `elements/<name>/` with five files. Template (Title):

```tsx
// types.ts
export interface PageUiTitleProps { text: string; level: '1' | '2'; size: 'sm'|'md'|'lg'; align: 'left'|'center'|'right'; }

// defaults.ts
export function createDefaultTitle(o?: Partial<PageUiTitleProps>): PageUiTitleProps {
  return {text: 'Section title', level: '1', size: 'lg', align: 'left', ...o};
}

// PuckTitleBlock.tsx  — render, reuse pageui primitives/classes
export function PuckTitleBlock({text, level, ...}: PageUiTitleProps) { /* h1/h2 */ }

// puck-config.tsx
import type {ComponentConfig} from '@puckeditor/core';
export const pageUiTitlePuckComponent: ComponentConfig<PageUiTitleProps> = {
  label: 'Title',
  defaultProps: createDefaultTitle(),
  fields: {
    text: {type: 'text', label: 'Text', contentEditable: true}, // inline edit on hover
    level: {type: 'select', options: [{label: 'H1', value: '1'}, {label: 'H2', value: '2'}]},
    // ...
  },
  render: props => <PuckTitleBlock {...props} />,
};

// index.ts — re-export component + createDefault + type
```

Key mechanics:
- `contentEditable: true` on a `text`/`textarea` field → Puck swaps the prop for an inline-editable node. Use it on every user-facing string.
- A leaf that itself contains a repeatable child (e.g. `SocialProof` → avatars) declares its own `slot` field and renders it (see Step 4 render pattern). Its render props type must map `Slot` → `SlotComponent`.
- Roll up leaf barrels in `elements/index.ts`.

### Step 4 — Section container (slots + allow)

Section in `sections/<name>/`. Props use `Slot` for authoring, `SlotComponent` for render.

```tsx
// types.ts
import type {Slot, SlotComponent} from '@puckeditor/core';
export type PageUiVideoCtaSectionProps = { variant: 'primary'|'secondary'; heading: Slot; body: Slot; actions: Slot; media: Slot; };
export type PageUiVideoCtaSectionRenderProps = Omit<PageUiVideoCtaSectionProps, 'heading'|'body'|'actions'|'media'> & {
  heading: SlotComponent; body: SlotComponent; actions: SlotComponent; media: SlotComponent;
};

// puck-config.tsx — restrict children with allow, referencing PAGE_UI names
fields: {
  heading: {type: 'slot', label: 'Heading', allow: [PAGE_UI.Title]},
  actions: {type: 'slot', label: 'Actions', allow: [PAGE_UI.Button, PAGE_UI.Discount]},
  // ...
}

// Block render — Slot is a component; pass layout via className + collisionAxis + minEmptyHeight
import {SLOT_MIN_HEIGHT} from '../../../layout/shared/fields';
<Actions className="flex flex-wrap gap-4 items-center" collisionAxis="x" minEmptyHeight={SLOT_MIN_HEIGHT} />
```

- Reimplement the section shell with `pageui.css` classes (`container-*`, grid, `fgrid`, glow) so it matches the original.
- Slot layout (row of buttons, grid of features, stack of avatars) is done with Tailwind classes on the rendered `<Slot>`, following the `columns` layout block pattern in `components/puck/layout/columns/`.
- `collisionAxis="x"` for horizontal slots, `"y"` for vertical.

### Step 2 helper — stable component names

Keep a single source of truth for Puck type names in `components/puck/pageui/shared/component-names.ts` (`PAGE_UI` const) and a small `puckItem(id, type, props)` helper in `shared/tree.ts`. Every `allow` list and every tree node references `PAGE_UI.*`.

### Step 5 — Template tree

`front-centre/slot-content.ts` exports `createFrontCentreSlotContent(): Content` that returns the full nested array: section containers, each with its slots pre-filled with leaves, all via `puckItem` with **stable ids**. Reuse `front-centre/shared-defaults.ts` clone helpers for repeated data (avatars, testimonials, faq, keypoints, features).

The template block `front-centre/` is a normal 5-file component whose single `sections` slot defaults to `createFrontCentreSlotContent()` and whose `allow` lists all section types. `createDefaultFrontCentre()` wraps it for the preset.

### Step 6 — Register in `lib/puck/config.tsx`

Four edits:
1. Import every `*PuckComponent` and prop type (from `elements`, `sections`, `front-centre`).
2. Add each prop type to the `LandingPageComponents` type map.
3. Add two categories: `pageui` (template + section containers) and `pageuiElements` (leaves), each listing its component names.
4. Add each entry to the `components: { ... }` map.

### Step 7 — Preset + selector

- `lib/puck/templates/<name>.ts`: export `<NAME>_TEMPLATE: PuckData = {root:{props:{}}, content:[{type:'FrontCentre', props:{id, ...createDefaultFrontCentre()}}]}` and include it in `LANDING_PAGE_TEMPLATES` (`{id, label, data}`).
- `pages/landing-pages/index.tsx` already renders the create dialog from `LANDING_PAGE_TEMPLATES`; a new entry appears automatically.

### Step 8 — Verify

```bash
cd apps/web && yarn tsc --noEmit
# then lint the whole app (no per-file eslint script):
cd /Users/diegoazevedo/projects/plunk && yarn lint --filter=web
```

Manual smoke test: create a page with the template → click title/paragraph/button/image/video/card/faq item/keypoint/icon/avatar (each selects + opens its props); hover text → inline edit; drag/reorder/add inside slots; publish and compare `/p/<publicId>` vs preview.

## Gotchas

- **No array fields for repeatable content.** Use slots of leaves so items are individually clickable.
- **FAQ = one self-contained `Collapsible` per item** (Radix `Collapsible` from `@plunk/ui`), not a single accordion — required for isolated selection.
- **Render prop types**: a slot prop is `Slot` in the authoring type but a `SlotComponent` (JSX component) at render. Keep separate `...Props` / `...RenderProps` types.
- **Stable ids** in the tree — reuse across `createDefault*` so migrate/normalize stays deterministic.
- **Field with conditional shape** (e.g. FeatureCard image|video): use `resolveFields` and type the builder as `Fields<Partial<Props>>`, casting back to `Fields<Props>`.
- **Old pages don't auto-migrate** if you replace an existing block set; `lib/puck/normalize-data.ts` (`migrate`) only handles declared legacy zones.
- **CSS not applying**: verify the component path is covered by a `@source` glob in `globals.css`.
```
