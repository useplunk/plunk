---
target: apps/landing homepage
total_score: 26
p0_count: 0
p1_count: 4
timestamp: 2026-08-17T07-46-31Z
slug: apps-landing-src-pages-index-tsx
---
# Critique — apps/landing homepage

Register: brand (marketing surface). Target: `apps/landing/src/pages/index.tsx`, verified live at `http://localhost:4000` at 1440×900.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hover/focus states are solid; nothing signals scroll position on a 12-section page |
| 2 | Match System / Real World | 3 | Developer vocabulary is right; "0 limits" doesn't parse as a phrase |
| 3 | User Control and Freedom | 3 | Feature cards look interactive but aren't; no route from the bento to `/features/*` |
| 4 | Consistency and Standards | 2 | Four labels for one signup action; two identical bento grids; type tokens bypassed 33× |
| 5 | Error Prevention | 3 | n/a for a marketing page |
| 6 | Recognition Rather Than Recall | 2 | Feature grid is a dead end; only 5 of ~16 `/vs` pages surfaced |
| 7 | Flexibility and Efficiency | 3 | Nav dropdown is well built and keyboard-accessible |
| 8 | Aesthetic and Minimalist Design | 2 | Whole viewports render empty; the same proof point repeats up to 5× |
| 9 | Error Recovery | 3 | n/a |
| 10 | Help and Documentation | 2 | FAQ structured data is emitted with no visible FAQ on the page |
| **Total** | | **26/40** | **Acceptable** |

## Anti-Patterns Verdict

**Deterministic scan**: `detect.mjs` over `index.tsx` + `src/components` returns `[]`. No gradient text, no side-stripes, no over-rounded cards, no sketchy SVG, no glassmorphism.

**LLM assessment**: this does not read as AI-generated. Funnel Display at extrabold with a real tuned scale, a committed black/neutral/white palette, and the MCP artifact all read as authored. Two patterns from the ban list survive:

- **Identical card grids, twice.** The features bento and the testimonials bento are the same composition: black featured card spanning 2 cols / 2 rows top-left, white bordered cards filling the rest, `lg:auto-rows-[17rem]`. `index.tsx:573` and `index.tsx:977` are structurally the same block.
- **Section eyebrows, reintroduced.** `SectionHeader.tsx` carries a comment explaining why the tracked-caps eyebrow was deleted. `index.tsx:544-549` reintroduces it inline as `/ Setup`, `/ Pricing`, `/ Ownership`.

## Overall Impression

The typography and the restraint are genuinely good. The problem is that the page is running at 60% density: it is 12 sections long, several of which render as empty screens, and it shows the product exactly once (the MCP exchange). Everything else is a claim in large type. The single biggest opportunity is filling the empty containers with the artifacts that already exist in this codebase.

## What's Working

- **The MCP section** (`index.tsx:763-803`). The `Artifact` + `AgentExchange` pairing is the one place a visitor sees Plunk do something: a real prompt, the real tool names, the real confirmation gate. It is the strongest thing on the page and it sets the bar the rest doesn't meet.
- **The type system** in `globals.css:79-110`. A ~1.28-ratio scale with a deliberate 14px-for-chrome-only carve-out, documented in the file. The reasoning is better than most design systems ship with.
- **Motion hygiene.** `MotionConfig reducedMotion="user"` in `_app.tsx:57` plus the marquee's `prefers-reduced-motion` block. Not an afterthought.
- **The competitor list** (`index.tsx:469-504`). Editorial, tactile, hover translate. Good instinct.

## Priority Issues

### [P1] The feature bento is five dead-end cards wrapped around empty space

`index.tsx:573-616`. The featured Workflow Automation card is ~500px tall with an icon at the top, a title at the bottom, and nothing between. The five small cards each carry ~120px of the same void. None of them link anywhere.

Meanwhile `src/components/sections/` holds `WorkflowChain`, `FilterBuilder`, `StepSequence`, `SpecList`, `StatBand` — all code-drawn artifacts, all already shipping on `/features/workflows`, `/features/segments`, `/features/inbound-email`, `/features/email-editor`. The homepage imports none of them.

**Why it matters**: the visitor is told six things and shown none of them, on the surface where the burden of proof is highest. And the six cards that most obviously want to be clicked lead nowhere, so the only route to a feature page is the nav dropdown.

**Fix**: put `WorkflowChain` inside the featured card. Make each card a `Link` to its `/features/*` page with the same hover treatment as the competitor rows. Drop `justify-between` where there's no content to justify.

**Suggested command**: `$impeccable craft` the feature bento, then `$impeccable layout`.

### [P1] Entire viewports render empty

At 1440×900, scrolling the page produces at least two screens with essentially nothing on them:

- The pricing section (`index.tsx:883`) uses `sm:py-56` (224px top and bottom) plus `mt-24` on the price block. Between the section header and `$0.001` there is a full 785px screen of nothing.
- The unified-contacts section (`index.tsx:682`) puts `my-10` around an 80px SVG arrow inside a `max-w-3xl` column, producing a near-blank screen holding one 40×80 arrowhead.

**Why it matters**: on a long page, an empty screen reads as "the page broke" or "this is over", not as breathing room. Generous spacing is a brand permission; a blank viewport is a bug.

**Fix**: cap section padding at `sm:py-36` (already the value everywhere else — pricing is the outlier at `py-56`), and collapse the arrow gap to `my-4`. Vary the rhythm instead of maxing it.

**Suggested command**: `$impeccable layout`

### [P1] Hierarchy inversion: competitors and a keyword ticker are louder than Plunk

The two loudest surfaces below the hero are (a) the black marquee at `text-5xl` cycling eight keywords (`index.tsx:429-460`) and (b) the competitor list where "Mailchimp" and "Customer.io" render at `lg:text-5xl` (`index.tsx:488`).

**Why it matters**: at 48px, the competitor names are the biggest words on the page after the h1. A visitor skimming reads Resend, SendGrid, Mailchimp, Customer.io, Mailgun in display type before they read anything Plunk does. The marquee amplifies terms already stated in the hero stat strip directly above it, at four times the size, with zero added information.

**Fix**: drop the competitor rows to `lg:text-4xl` and give "vs Plunk" real weight so the row reads as a comparison rather than a competitor billboard. Either cut the marquee or make it carry something the page doesn't already say.

**Suggested command**: `$impeccable typeset` for the scale, `$impeccable distill` for the marquee.

### [P1] Four labels for one action

The signup CTA is called: "Get started" (nav), "Get started free" (`:331`), "Start for free" (`:961`), "Create free account" (`:1071`). All four point at `${DASHBOARD_URI}/auth/signup`.

**Why it matters**: PRODUCT.md's design principle 5 is "Consistency is trust… one way to show errors, one way to show success. No creative variation in functional UI." A CTA is functional UI. Four names for one door makes the page feel written by four people.

**Fix**: pick one label and use it everywhere, including the nav. "Start for free" is the most specific.

**Suggested command**: `$impeccable clarify`

### [P2] The same proof points are stated up to five times

`$0.001` appears in the hero subtitle, the hero stat strip, the marquee, the problem section, the pricing hero, and the closing CTA. Open-source/AGPL appears in the h1, the marquee, the "Ownership" column, the open-source card trio, and the footer CTA. "5,000+ stars" appears three times.

The open-source section (`index.tsx:806-879`) is the clearest casualty: three cards saying AGPL-3.0 / EU hosted / Deploy anywhere, all three already stated in the marquee and the "/ Ownership" column two sections earlier.

**Why it matters**: repetition without escalation reads as thin content, not emphasis. It is also why the page needs 12 sections to say what 8 would say better.

**Fix**: let each section own one claim. Cut the open-source card trio and fold self-hosting into the problem section's "Ownership" column, which already makes the argument better.

**Suggested command**: `$impeccable distill`

### [P2] FAQ structured data with no FAQ on the page

`index.tsx:187-243` injects a `FAQPage` JSON-LD with five Q&As. None of that content is rendered. Every `/vs/*` and `/guides/*` page renders a real `FAQSection`; the homepage imports the component and never uses it.

**Why it matters**: Google's structured-data policy requires FAQ content to be visible on the page; invisible FAQ markup is a manual-action risk. It is also a content gap — the five questions in that blob answer exactly what a first-time visitor asks.

**Fix**: render `FAQSection` with those five entries before the closing CTA, or remove the schema.

**Suggested command**: `$impeccable craft` an FAQ section.

### [P2] The design system is bypassed on its own flagship page

`globals.css:82` says pages "compose from these instead of hand-rolling arbitrary values." The homepage uses 33 raw Tailwind size classes against 23 token classes, plus `text-[10px]` and `text-[11px]` (`index.tsx:1024`) — both below the 12px floor the scale deliberately sets. It also carries 23 inline `style={{fontFamily: 'var(--font-display)'}}` / `var(--font-mono)` declarations, 13 of them on `h1`/`h2`/`h3` elements that `globals.css:174` already sets to the display font.

**Why it matters**: the tokens exist and are well reasoned. Every raw `text-5xl` is a decision re-made by hand, which is exactly how the "flattened scale" the comments describe crept in the first time.

**Fix**: add `font-display` / `font-mono` utilities in `@theme`, delete the 23 inline styles and the 13 redundant ones outright, and map the raw sizes onto the token scale.

**Suggested command**: `$impeccable extract`

### [P2] Every section enters the same way

13 `whileInView` reveals, all `opacity 0 → 1` with `y: 16` and the same cubic-bezier. Scrolling at normal speed, sections arrive mid-fade: I captured the competitor list as five empty rows and the problem section with columns 2 and 3 blank while column 1 was legible.

**Why it matters**: a uniform entrance applied to every section is the motion reflex, not motion design — and staggering `delay: i * 0.1` on content that is already fully in view means fast scrollers read blank space.

**Fix**: keep the reveal for the two or three moments that earn it (the hero, the MCP artifact, the price). Let the rest render. Where a stagger stays, tighten the delay and widen the `viewport.margin` so items are done animating by the time they're centred.

**Suggested command**: `$impeccable animate`

## Persona Red Flags

**Jordan (first-timer)**: reaches the feature bento, sees six things Plunk does, tries to click "Workflow Automation" to learn more, and nothing happens. The only path to a feature page is a nav dropdown they have to discover. Reaches the bottom having read "$0.001" five times and never seen the product's interface.

**Riley (stress tester)**: scrolls at speed and catches half the page mid-fade. Notices the contact card's "89% open rate" (`index.tsx:738`) sitting under a section headed "No hyperbole" — an implausible number presented in the visual language of real data. Notices the FAQ schema with no FAQ.

**Casey (mobile)**: the ticker at `text-4xl` and the competitor rows still work, but the pricing section's `py-40` plus `mt-24` means multiple thumb-flicks of blank screen between the header and the price. The five-item competitor list and the 12-section length make this a long scroll for a phone.

## Minor Observations

- **Logo strip** (`index.tsx:411`): `grayscale opacity-40` is faint enough that at a glance the row reads as placeholder. The five logos also differ in optical weight — `krumzi` and `Waidwissen` are wordmarks at `h-7`, `viral.app` and `SnowSEO` are patched to `h-9`. Normalize on cap-height, not pixel height, and lift the resting opacity to ~55%.
- **Axis mismatch**: the contacts and pricing sections put a left-rail `SectionHeader` above centre-aligned content (`max-w-3xl mx-auto`, `text-center`). Two competing axes in one section. Pick one per section.
- **`0 limits`** (`index.tsx:526`) doesn't read as English next to `< 5 min` and `AGPL-3.0`. "No limits" or "Unlimited" is the same idea and parses.
- **Testimonial roles** at 10px (`index.tsx:1024`) are the smallest text on the page, on the content whose whole job is credibility. Founding Operations Manager at Resend is a name worth reading.
- **`aria-hidden` on the marquee section** (`index.tsx:429`) is correct for decoration, but "5,000+ GitHub Stars" and "GDPR Compliant" are claims a screen reader user never hears. They're stated elsewhere, so this is defensible — worth a deliberate decision rather than a side effect.
- Only 5 of ~16 `/vs/*` pages are surfaced. An "All comparisons" link at the end of that list is one line.

## Questions to Consider

- The MCP section is the only place the product appears. What would this page look like if every section had to show something rather than assert it?
- Does this need 12 sections? "Simple to start / Serious at scale" already makes the pricing, setup, and ownership arguments. Three sections downstream restate them at greater length.
- The competitor list, the marquee, and the pricing comparison all frame Plunk against other tools. What's the version of this page that leads with what Plunk is rather than what it replaces?
