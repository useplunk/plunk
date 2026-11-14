---
name: Plunk
description: The open-source email platform. Marketing site (www.useplunk.com).
colors:
  ink: "#171717"
  ink-hover: "#262626"
  graphite: "#525252"
  slate-text: "#737373"
  hairline: "#e5e5e5"
  rule-strong: "#d4d4d4"
  tile: "oklch(0.968 0 0)"
  paper: "#ffffff"
  ok: "oklch(0.52 0.13 155)"
  ok-surface: "oklch(0.96 0.025 155)"
  warn: "oklch(0.55 0.12 75)"
  warn-surface: "oklch(0.96 0.035 75)"
  err: "oklch(0.53 0.19 25)"
  err-surface: "oklch(0.96 0.025 25)"
typography:
  display:
    fontFamily: "Funnel Display, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.04em"
  hero:
    fontFamily: "Funnel Display, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.25vw, 4rem)"
    fontWeight: 800
    lineHeight: 1
  headline:
    fontFamily: "Funnel Display, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.05
  title:
    fontFamily: "Funnel Display, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.2
  lead:
    fontFamily: "Funnel Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    lineHeight: 1.55
  body:
    fontFamily: "Funnel Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.65
  ui:
    fontFamily: "Funnel Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  card: "16px"
  pill: "9999px"
spacing:
  page-x-mobile: "24px"
  page-x-desktop: "40px"
  section-y: "80px"
  section-y-lg: "112px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 32px"
  tile:
    backgroundColor: "{colors.tile}"
    rounded: "{rounded.card}"
  fragment-card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
---

# Design System: Plunk

## Overview

**Creative North Star: "The Spec Sheet"**

The site reads like a precise spec sheet: black on white, every element stating a fact a developer can check. Confidence comes from restraint. There is no accent colour and no decoration, and nothing is there to look busy. A big, tight display face carries the voice; neutral tiles and hairlines carry the structure; real product fragments, drawn in code, carry the proof.

Density is considered, not generous. Sections breathe vertically, but within a section things sit close and aligned, the way a well-set data sheet groups related facts. Colour appears only when it means something: a delivered state, a validation error, a warning.

**Key Characteristics:**
- Black, neutral and white only; semantic colour reserved for state.
- Heavy display type with tight tracking against a calm sans body.
- Flat tonal tiles and 1px hairlines instead of shadows.
- Product proof drawn in code (snippet fragments), never screenshots or stock imagery.
- Pill-shaped CTAs; 16px card radius everywhere else.

## Colors

A monochrome palette where weight and value do all the work.

### Primary
- **Ink** (#171717): primary text, headings, the primary CTA fill, and active marks. It's the only "brand colour".

### Neutral
- **Ink Hover** (#262626): the primary CTA hover fill.
- **Graphite** (#525252): secondary prose and supporting copy.
- **Slate Text** (#737373): captions, labels and quiet chrome (e.g. "Built into products at"). Use it only at UI size or above, where it stays AA on white.
- **Hairline** (#e5e5e5): dividers, card borders and table rules.
- **Strong Rule** (#d4d4d4): outlined secondary button borders.
- **Tile** (oklch(0.968 0 0)): the flat panel a product fragment sits on.
- **Paper** (#ffffff): the page and card surfaces.

### Semantic (state only)
- **Ok / Warn / Err** with matching `-surface` tints: tool results, delivery states and validation. They're never decoration.

### Named Rules
**The No-Accent Rule.** The brand palette is black, neutral and white. A hue on screen must name a state; if it doesn't, it goes.

**The Grayscale Guests Rule.** Third-party marks (customer logos, integrations) rest in grayscale at reduced opacity, and their colour is revealed only on hover. Plunk's page never takes on another brand's palette.

## Typography

**Display Font:** Funnel Display (fallback: ui-sans-serif, system-ui)
**Body Font:** Funnel Sans (fallback: ui-sans-serif, system-ui)
**Label/Mono Font:** JetBrains Mono, for code and metadata only

**Character:** A dense, extra-bold display face makes the claims; a quiet humanist sans explains them. Mono appears only where the content is code or a measurement.

### Hierarchy
- **Display** (800, clamp(2.5rem, 6vw, 6rem), 0.94, -0.04em): the homepage h1 only.
- **Hero** (800, clamp(2.25rem, 4.25vw, 4rem), 1): page titles that share the fold with a graphic.
- **Headline** (700, clamp(2rem, 4vw, 3.25rem), 1.05): section headings.
- **Title** (700, 1.625rem, 1.2): card and feature titles.
- **Lead** (1.25rem, 1.55): section intros and the hero subtitle.
- **Body** (1rem, 1.65): prose; keep it to a 65–75ch measure.
- **UI** (0.875rem, 1.5): chrome only (buttons, nav, table cells, captions). Never reading copy.
- **Label** (mono, 0.75rem, 1.4): code-adjacent metadata.

### Named Rules
**The No-14px-Prose Rule.** 14px exists for interface chrome. If it's a sentence someone reads, it's set at Body.

## Layout

Pages sit in a centred container up to 88rem with 24px side padding on mobile and 40px from `sm`. Sections run 80px vertically, rising to 112px at `lg`. Content blocks inside a section narrow further (max-w-2xl to max-w-6xl) to hold measure. Grids collapse to one column on mobile and two or three on tablet; rows of items must never leave a lone orphan on the last line. Breakpoints are Tailwind defaults (sm 640, md 768, lg 1024, xl 1280).

## Elevation & Depth

Flat by default. Depth comes from tone: a white fragment card sits on a `tile` panel, separated by a hairline. The one shadow in the system, `fragment`, is short and faint enough to lift a product snippet off its tile without reading as a floating card.

### Shadow Vocabulary
- **Fragment** (`box-shadow: 0 1px 2px oklch(0 0 0 / 0.04), 0 2px 6px oklch(0 0 0 / 0.04)`): only on faux product fragments resting on a tile.

### Named Rules
**The Tone-Not-Shadow Rule.** To separate layers, change the tone or add a hairline. Don't add a shadow.

## Shapes

There are two corner languages: full pills for actions (buttons, tags, chips) and a single 16px card radius for containers (tiles, fragments, panels). Borders are 1px hairlines. Nothing is clipped into decorative shapes.

## Components

### Buttons
Confident and restrained.
- **Shape:** full pill (9999px).
- **Primary:** Ink fill, white label, 16px × 32px padding, semibold. Hover moves to Ink Hover; Framer motion adds a tiny scale (1.015 on hover, 0.985 on press).
- **Secondary:** white fill, Ink label, 1px Strong Rule border; the border turns Ink on hover.

### Cards / Containers
- **Corner Style:** 16px (`--radius-card`).
- **Background:** Tile for panels, Paper for fragments on a tile.
- **Shadow Strategy:** none, except Fragment (see Elevation).
- **Border:** 1px Hairline where a container sits on Paper.

### Navigation
A white sticky bar with a bottom hairline. Links are set in UI size and Ink, with a GitHub star count and a "Sign in" text link, and the primary pill CTA sits at the far right.

### Customer Logo Wall
Customer marks are normalised on cap-height (28px, or 32px for marks with small x-height), rendered grayscale at 60% opacity and revealed to full colour on hover. A quiet Slate Text caption introduces them.

## Do's and Don'ts

### Do:
- **Do** keep the palette to Ink, neutrals and Paper; use semantic colour only for state.
- **Do** build product visuals as code-drawn fragments on a Tile.
- **Do** use the pill for actions and the 16px card radius for containers.
- **Do** normalise third-party logos on cap-height, not box height.

### Don't:
- **Don't** add screenshots, stock photography or decorative imagery.
- **Don't** introduce an accent colour or gradient text.
- **Don't** use shadows to separate layers beyond the Fragment shadow.
- **Don't** set reading copy at 14px.
- **Don't** put a kicker or eyebrow label above a heading.
