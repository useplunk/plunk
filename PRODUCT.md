# Product

## Register

product

## Users

Developer-founders and indie hackers building SaaS products. They use Plunk to handle
transactional email, marketing campaigns, and workflow automation without the complexity of
Mailchimp or Customer.io. They are technically fluent: they read API docs, they know what a
webhook is, they do not need "email marketing" explained to them.

They notice tiny details. Inconsistent spacing, placeholder text that adds no value, a button
that does not communicate state, the same concept called two different names on two screens.

Context: professional environment, desktop-first, task-focused. They are usually mid-task
(shipping a signup flow, debugging a bounce, launching a campaign), not browsing.

## Product Purpose

Plunk is an open-source email platform that unifies transactional sending, marketing campaigns,
and automation. Self-hostable, $0.001 per email, no contact limits. Success looks like a
developer getting from signup to a first sent email without reading documentation, and never
needing a support ticket to understand what a screen is asking of them.

## Brand Personality

Sharp, minimal, confident. The product earns trust by being simple and correct, not by being
flashy. Testimonials emphasize "transparent UI", "easy setup", "clean design". The brand is
*care without noise*.

Voice: direct, technical peer to technical peer. Short sentences. Says what a thing does, not
how great it is. Never markets to the user inside the app.

## Anti-references

- Mailchimp, Customer.io, HubSpot: feature-bloat, tutorial-tone copy, marketing language inside
  the product UI.
- Enterprise SaaS onboarding that explains its own navigation in paragraphs.
- Copy that hedges ("you may want to consider..."), apologizes, or over-reassures.

## Design Principles

1. **Every pixel earns its place.** If something does not communicate information or provide an
   affordance, remove it.
2. **Neutral by default, semantic by exception.** Color is reserved for error/success/warning
   states, not decoration.
3. **Interaction should feel fast.** Loading states communicate exactly what is happening. No
   silent actions.
4. **Developer-grade precision.** Copy is short and direct. Placeholders only appear when they
   add value. Labels are unambiguous.
5. **Consistency is trust.** The same pattern everywhere. One way to show errors, one way to
   show success. No creative variation in functional UI.

## Terminology

User-facing vocabulary is fixed and matches the API and documentation. Do not rename these in
the UI: Contact, Event, Action, Trigger, Campaign, Workflow, Template, Segment, Project, API key.
Standardize the wording *around* them instead (one verb for delete, one for create, and so on).

## Aesthetic Direction

Light mode only. Palette: black (`neutral-900`), neutral grays, white. No accent colors, no
color for decoration. Backgrounds are near-white with subtle texture; auth pages use a dot-grid
(`radial-gradient(#e5e7eb 1px, transparent 1px)` at `20px 20px`). Cards are white with a neutral
border and light shadow. Typography is precise and legible, not editorial. Spacing is
considered, not generous.

## Accessibility & Inclusion

Desktop-first but must not break on tablet. Link text carries standalone meaning, icon-only
buttons carry `aria-label`, error text is never conveyed by color alone. Respect
`prefers-reduced-motion`.
