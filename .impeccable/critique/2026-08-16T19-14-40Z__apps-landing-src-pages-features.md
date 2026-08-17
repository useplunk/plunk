---
target: apps/landing/src/pages/features (six feature pages)
total_score: 26
p0_count: 0
p1_count: 3
timestamp: 2026-08-16T19-14-40Z
slug: apps-landing-src-pages-features
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Features dropdown gives no active state for the page you're on |
| 2 | Match System / Real World | 2 | Spec-sheet noun labels ("Re-entry Control", "Smart Mode Switching", "Behavior-Based") in place of sentences; flow strings rendered as 11px all-caps mono |
| 3 | User Control and Freedom | 4 | Nav, breadcrumb, and footer all present; no traps |
| 4 | Consistency and Standards | 3 | Six near-identical templates, but the offer statement contradicts itself (segments says "1,000 emails free"; three others say "Free plan available. $0.001 per email on paid") |
| 5 | Error Prevention | 3 | No forms; nothing to get wrong |
| 6 | Recognition Rather Than Recall | 2 | All six pages share one silhouette; nothing distinguishes them at a glance or in the nav |
| 7 | Flexibility and Efficiency | 2 | Long pages with no in-page nav or anchors; no way to jump to the part you came for |
| 8 | Aesthetic and Minimalist Design | 2 | 36 identical cards, three parallel numbering systems, mono applied decoratively, zero product imagery |
| 9 | Error Recovery | 3 | n/a for marketing pages |
| 10 | Help and Documentation | 2 | "View documentation" on 5 of 6 pages links to the wiki root, not the relevant guide |
| **Total** | | **26/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment.** These pages don't read as AI-generated in the usual way (no gradient text, no glassmorphism, no stock-hero cliché, and the black/neutral/white palette is genuinely the brand's). They fail on a subtler axis: **template sameness plus scaffolding-by-reflex**. All six pages are the same five sections in the same order — hero, six-card grid, three-step or table, numbered use-case list, dark CTA. Two absolute bans from the skill are hit directly:

- **Numbered section markers as default scaffolding.** Three parallel numbering systems run on one page: the feature cards number 01–06, the how-it-works steps number STEP 01–03, and the use-case list numbers 01–03 again. Only the middle one is an actual sequence. The other two are decoration.
- **Identical card grids.** Six same-sized icon + heading + text cards per page, six pages: 36 interchangeable cards.

Two more from the Codex-specific list:
- **`rounded-[28px]` on cards** (14 occurrences). The ceiling for cards is 12–16px; 24/28/32px is the over-round tell.
- **All-caps body copy.** Full sentences set in 11px uppercase tracked mono: `TRIGGER ON CART ABANDONED → WAIT 1 HOUR → SEND REMINDER → WAIT 1 DAY → SEND DISCOUNT OFFER`. That is a sentence, not a label.

And the brand register's ban on **mono as shorthand for "technical."** Plunk is genuinely a developer product, so mono isn't costume here, but it has spread from labels into eyebrows, card numbers, step markers, benefit lines, flow strings, and filter conditions: 28 uppercase-tracked mono instances across the six pages. That density is the single biggest source of the "geeky" feeling.

**Deterministic scan.** `detect.mjs` returned 10 findings across the six files, exit 0:

| Finding | Severity | Count | Files |
|---|---|---|---|
| Flat type hierarchy | warning | 6 | all six pages (14/16/18/20px, ratio 1.4:1) |
| Numbered section markers | advisory | 3 | email-editor, inbound-email, workflows |
| Em-dash overuse | warning | 1 | mcp.tsx (7 em-dashes) |

Where the two assessments agree: numbered markers. The detector **undercounts** it — it only caught the three pages with literal `STEP 01` strings, and missed the 01–06 card numbering and 01–03 use-case numbering that run on all six pages.

The flat-type-hierarchy warning is the most useful automated finding, and it is direct evidence for "dense": the four body tiers (14/16/18/20px) are close enough that card text, card headings, section subtitles, and lead paragraphs all read at roughly one weight. Nothing recedes, so everything competes.

No false positives. The em-dash hit on `mcp.tsx` is fair, though it's a house-style call: the em dash appears in the existing pages too and reads as deliberate voice rather than AI cadence.

**Visual overlays.** Not available. Browser inspection was done via direct screenshots of the running dev server at `localhost:4000` rather than the script-injection overlay path.

## Overall Impression

The craft level is high and the restraint is real. The problem is that restraint has been applied uniformly, and uniform restraint at this length reads as a spec sheet.

The clearest symptom: the workflows page has a section headed **"Visual workflow builder"** whose entire content is three boxes of text. The product's most visual feature is described in prose. Across all six pages there is not a single product screenshot, diagram, or rendered artifact — `grep` for `<img` or `next/image` returns zero. The brand register calls text-only pages where typography carries the whole visual load the failure mode, and this is that.

The single biggest opportunity: **show the product**. One real screenshot of the workflow canvas, the segment filter builder, or the editor's split view would do more for these pages than any copy edit, and would let you delete half the descriptive text that currently substitutes for it.

## What's Working

1. **The hero construction is genuinely good.** The masked grid background, the tight display type, and the two-CTA row give each page a confident opening. `Email automation / that actually works.` earns its size.
2. **The palette holds the line.** Black, neutrals, white, no decorative color anywhere. This is exactly what PRODUCT.md specifies, and it's the reason the pages don't read as AI slop despite the structural repetition.
3. **The dark CTA band is a strong close.** Oversized headline left, offer and buttons right; it lands as an actual moment rather than a footer afterthought.

## Priority Issues

**[P1] Zero product imagery across all six pages**
- *Why it matters*: Plunk's differentiators are visual (a drag-and-drop workflow canvas, a filter builder, a split-pane editor). Describing them in prose asks the visitor to imagine the product instead of seeing it, and it forces every section to carry its weight in words, which is what makes the pages feel dense. A "Visual workflow builder" heading over three text boxes actively undercuts the claim.
- *Fix*: Add one real screenshot or rendered artifact per page as the anchor of the middle section, then cut the surrounding copy by roughly half. Start with workflows (the canvas), segments (the filter builder), and email-editor (the split view).
- *Suggested command*: `$impeccable layout`

**[P1] Three parallel numbering systems and 36 interchangeable cards**
- *Why it matters*: The reader sees `01` three times in three different meanings on one page. Numbers stop carrying information and become texture. Combined with six identical card grids, the six pages become one page the reader has already read, which is a recognition failure as much as an aesthetic one.
- *Fix*: Keep numbering only where the order is real (the three-step how-it-works). Drop the 01–06 card numbers and the 01–03 use-case numbers. Vary the section shape between pages so each has its own silhouette instead of the shared template.
- *Suggested command*: `$impeccable distill`

**[P1] `text-neutral-400` fails contrast in 28 places**
- *Why it matters*: `#a3a3a3` on white is **2.5:1**, which fails WCAG AA for body text (4.5:1) and even the large-text floor (3:1). It's used for every card number, every STEP label, every `→ BENEFIT` line, the breadcrumb, and the all-caps flow strings. Low-contrast small caps is hard to scan, so the eye registers it as noise rather than content, which is a direct contributor to the "dense" complaint.
- *Fix*: Move to `text-neutral-500` (`#737373`, 4.74:1) everywhere on white. For the flow strings, drop uppercase and tracking entirely and set them as normal-case mono at `neutral-600`.
- *Suggested command*: `$impeccable audit`

**[P2] Copy is spec-sheet nouns plus six aphoristic quips**
- *Why it matters*: PRODUCT.md's voice is "direct, technical peer to technical peer. Short sentences. Says what a thing does, not how great it is." Two patterns break it. First, the card titles are Title Case Compound Nouns ("Event-Driven Triggers", "Smart Email Sequences", "Email-Safe HTML", "Behavior-Based") — labels from a feature matrix, which is Mailchimp's register and an explicit anti-reference. Second, six section copy blocks end on a rebuttal-shaped quip: "Patience is a virtue." / "No spam, just strategy." / "Less noise, more signal." / "No PhD required." / "Yes, even in Outlook." / "The spam stays out, the good stuff gets in." The skill's threshold is three; there are six. Alongside them sit the buzzwords the brand supposedly rejects: "sophisticated" (x4), "seamlessly" (x3), "Powerful" (x5), "Complete inbound email solution", "Everything you need" (x2), and segments' promise to "watch your open rates climb".
- *Fix*: Rewrite card titles as short verb phrases that say what happens. Cut all six quips. Cut the buzzword list. Delete the section subtitles that restate their own heading ("Everything you need for email automation" / "Powerful features that make complex automations simple").
- *Suggested command*: `$impeccable clarify`

**[P2] "View documentation" goes to the wiki root on 5 of 6 pages**
- *Why it matters*: A visitor on the segments page who clicks "View documentation" lands on the docs homepage and has to search for segments. The link text promises specificity the destination doesn't deliver, and it wastes the highest-intent secondary click on the page.
- *Fix*: Deep-link each page to its guide, the way `mcp.tsx` already does with `${WIKI_URI}/docs/guides/mcp-server`. While there, fix the offer inconsistency: segments claims "1,000 emails free" where three other pages say "Free plan available. $0.001 per email on paid."
- *Suggested command*: `$impeccable clarify`

**[P2] 51 scroll reveals with no reduced-motion fallback**
- *Why it matters*: Every section on every page uses the identical `initial opacity 0, y 16 → whileInView` entrance. The skill names the uniform reflex specifically: not motion itself, but one identical entrance applied to every section. Worse, `globals.css` only handles `prefers-reduced-motion` for `.marquee-track`; Framer Motion is not configured with `MotionConfig reducedMotion="user"`, so all 51 reveals still animate for users who asked them not to.
- *Fix*: Add `<MotionConfig reducedMotion="user">` in `_app.tsx` (one line, fixes it site-wide). Then cut the reveal from sections where it adds nothing and keep it where the content is a sequence.
- *Suggested command*: `$impeccable animate`

## Persona Red Flags

**Jordan (First-Timer)**: Lands on `/features/segments` from a search. The page opens with "Dynamic Filtering", "AND/OR logic", "Custom field: totalSpent greater than 1000" set in tracked caps. Nothing on the page shows what a segment looks like. Jordan cannot tell whether this is a UI they'd click through or an API they'd have to code against, and there's no screenshot to answer the question. They click "View documentation", land on the docs homepage, and leave.

**Casey (Distracted Mobile User)**: Each page is roughly 5 screens of scroll on desktop and considerably more on a phone, with no in-page nav and no anchor links. The 11px all-caps mono flow strings at 2.5:1 contrast are effectively unreadable on a phone in daylight. The primary CTA appears at the very top and again at the very bottom, with four screens of card grid in between and nothing sticky, so a Casey who scrolls partway and gets interrupted has no action within reach.

**Riley (Stress Tester)**: Opens all six feature pages in tabs and immediately notices they're the same page with different nouns. Spots that segments promises "1,000 emails free" while workflows, email-editor, and inbound-email all promise "Free plan available. $0.001 per email on paid" — and reasonably asks which one is true. Also notices the workflows page advertises a "Visual workflow builder" and never shows it.

## Minor Observations

- Hero clamp max is `6.5rem` (104px); the skill's ceiling is `6rem`. Marginal, but it's the reason the hero eats a full screen before any content.
- Display letter-spacing sits at `-0.04em`, exactly on the floor. Fine, but there's no headroom left.
- The mono card numbers on the black featured card are `neutral-500` on `neutral-900` — 3.78:1. Decorative, so lower stakes, but under AA.
- `email-editor.tsx:6` imports `Mail` and never uses it (existing lint warning).
- The smtp page's comparison table is the one genuinely differentiated section across all six pages, and it's the most useful thing on any of them. Worth noticing that the page that broke the template is the page that works best.

## Questions to Consider

- What would these pages look like if each one were allowed a different shape — segments as an interactive filter demo, workflows as a single annotated canvas screenshot, smtp as just the table and nothing else?
- If you deleted the six-card grid from every page, what would actually be lost? Which of the 36 cards has ever changed a purchase decision?
- The smtp page's comparison table is the strongest section on the site. What would the workflows page look like if it were built around one comparison instead of six cards?
- Is the mono type doing work, or is it wearing a lab coat?
