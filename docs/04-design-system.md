# NIVA — UI/UX Design System

| Field | Value |
| --- | --- |
| Document | 04-design-system.md |
| Version | 1.0 (architecture baseline) |
| Task | 2-a |
| Related | 00-executive-summary.md §7, 01-system-architecture.md ADR-002/007, 09-test-plan.md §7 |

The design system is implemented with Tailwind CSS 4 + shadcn/ui (New York style) +
next-themes (light/dark). Tokens below are the canonical reference; they are set as CSS
custom properties in `src/app/globals.css` and exposed to Tailwind through `@theme inline`.
Where the scaffold stylesheet still carries default values, adopting this token set is a
tracked backlog item (`10-backlog-risk.md`, Phase 3) — this document is the target the
implementation follows.

## 1. Design principles

1. Calm authority: soft warm surfaces, restrained color, generous whitespace — a health
   companion, not a casino.
2. Equal typography: Persian is typeset first-class (Vazirmatn), not squeezed into a Latin
   grid.
3. Predictable safety color: destructive/emergency styling is reserved for safety moments
   (red flags, escalation cards) and is never decorative.
4. Motion explains, never entertains; reduced-motion is a first-class mode.

## 2. Color tokens

Semantic names only; raw hexes appear in exactly one place (the stylesheet).

### Light theme (cream surfaces)

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#FBF7F1` cream | app background |
| `--foreground` | `#2B2320` warm ink | primary text |
| `--card` | `#FFFFFF` | cards, sheets |
| `--muted` | `#F3EDE4` | subtle fills |
| `--muted-foreground` | `#6B5F58` | secondary text |
| `--primary` | `#9E4A5C` warm rose (deep) | primary actions, active nav |
| `--primary-foreground` | `#FFFFFF` | text on primary |
| `--secondary` | `#5F7D5C` sage (deep) | secondary actions, health-positive |
| `--accent` | `#8A6210` amber (deep) | highlights, streaks, badges |
| `--destructive` | `#B3261E` | red flags, errors, escalation |
| `--border` / `--input` | `#E5DCCF` | hairlines, inputs |
| `--ring` | `#9E4A5C` | focus ring |

Decorative variants (`--rose-300 #D98A99`, `--sage-300 #A8BFA3`, `--amber-300 #E8B65A`) are
for illustration fills and charts, never for text.

### Dark theme (aubergine)

| Token | Value |
| --- | --- |
| `--background` | `#241A22` aubergine |
| `--card` | `#2E222C` |
| `--foreground` | `#F4EBEE` |
| `--muted` | `#352833` |
| `--primary` | `#E39CAC` rose (light) with `--primary-foreground: #3A121C` |
| `--secondary` | `#A9C4A2` sage (light), foreground `#1E2A1C` |
| `--accent` | `#E8B65A` amber, foreground `#2C1F04` |
| `--destructive` | `#F2B8B5` on dark surfaces |
| `--border` | `#3E2F3A` |

Contrast contract: every foreground/background pair used for text meets WCAG 2.2 AA
(4.5:1 normal text, 3:1 large text and UI components); pairs are verified during the
accessibility pass (`09-test-plan.md` §7) and recorded as evidence. Deep variants are used
whenever colored text sits on cream/white to guarantee AA.

## 3. Typography

| Face | Locale | Source |
| --- | --- | --- |
| Vazirmatn | fa | CDN font link, weights 400/500/700 |
| Inter | en | CDN font link, weights 400/500/700 |

| Style | Size / line-height | Notes |
| --- | --- | --- |
| display | 2.5rem / 1.15 | landing hero, studio title |
| h1 | 1.75rem / 1.3 | screen titles |
| h2 | 1.375rem / 1.35 | section heads |
| h3 | 1.125rem / 1.4 | card heads |
| body | 1rem / 1.7 en, **1.8 fa** | Persian needs taller line height |
| small | 0.875rem / 1.5 | metadata |
| caption | 0.75rem / 1.4 | timestamps, citations |

Numerals and dates: locale-aware digits (Persian digits in fa), `date-fns` locale
formatting; gestational weeks render as "هفته ۱۲" / "Week 12" respectively. Font size is
never below 12px; body text is user-scalable (no viewport text-size locking).

## 4. Spacing, radii, elevation

- Spacing scale (rem): 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 / 4 — used via Tailwind steps
  (1, 2, 3, 4, 6, 8, 12, 16). Screen gutters: 1rem mobile, 2rem desktop.
- Radii: `--radius` 0.625rem base; sm `calc(r - 4px)` inputs; md; lg cards; xl sheets;
  full for pills/avatars. Escalation cards use lg + destructive border for recognition.
- Elevation (light): `shadow-sm` cards resting; `shadow-md` popovers/dropdowns; `shadow-lg`
  dialogs. Dark theme uses surface lightening + 1px borders instead of heavy shadows.
- Z-index scale: content 0, sticky 10, drawer 40, dialog 50, toast 60, 3D overlays 20.

## 5. Motion

| Token | Value | Usage |
| --- | --- | --- |
| duration-fast | 150ms | hovers, presses |
| duration-base | 250ms | view transitions, sheets |
| duration-slow | 400ms | onboarding, studio camera moves |
| easing | cubic-bezier(0.2, 0, 0, 1) | all transitions |

Framer-motion powers view enter/exit. Reduced-motion rules: when
`prefers-reduced-motion: reduce` is set, or the in-app toggle (Settings) is on — no
auto-rotating 3D camera, no parallax, no looping scene animation, transitions collapse to
opacity-only, and the 3D studio defaults to a static frame (05-3d-asset-spec.md §9).

## 6. RTL/LTR rules (ADR-007)

1. Direction switching is runtime: `document.documentElement.dir = "rtl" | "ltr"` and
   `lang` set together on locale change; no page reload.
2. Logical properties only: `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`;
   physical `left/right` utilities are banned in review.
3. Directional icons mirror (arrows, chevrons, back); semantic icons do not (heart, alert).
4. Charts and the 3D studio keep a spatial LTR frame; their surrounding UI mirrors. Studio
   hotspots label in the active locale.
5. Numbers, code spans, and Latin medical terms inside Persian text are wrapped with
   bidirectional isolation (`<bdi>`/`unicode-bidi: isolate`).
6. Form validation messages localize; input `dir="auto"` for free text fields.

## 7. The 20 screens (view ids of the client router, ADR-002)

| # | View id | Screen | Key components |
| --- | --- | --- | --- |
| 1 | `v-landing` | Welcome/landing, language + theme pick | Button, Card |
| 2 | `v-auth` | Login / Register | Input, Label, Button, Alert |
| 3 | `v-onboarding` | Profile + gestational dating wizard | Stepper, Select, Calendar |
| 4 | `v-dashboard` | Home: week card, safety shortcuts | Card, Progress |
| 5 | `v-timeline` | Week-by-week timeline (module C) | Accordion, Tabs |
| 6 | `v-studio` | 3D fetal studio | Canvas, Slider, Switch, Tooltip |
| 7 | `v-ai` | AI assistant chat | Chat bubbles, Badge (citations) |
| 8 | `v-tracking` | Health tracking + symptom entry | Chart, Form, Slider |
| 9 | `v-journal` | Journal list + editor | Textarea, Card |
| 10 | `v-appointments` | Appointments | Calendar, Select |
| 11 | `v-reminders` | Reminders | Switch, Badge |
| 12 | `v-documents` | Medical documents registry | Table, Dialog |
| 13 | `v-education` | Education library (K–O tracks) | Tabs, Card grid |
| 14 | `v-article` | Content detail + citations | Prose, Breadcrumb |
| 15 | `v-community` | Community feed | Card, Avatar, Report dialog |
| 16 | `v-post` | Post composer (alias, invitation gate) | Textarea, Checkbox |
| 17 | `v-family` | Family access grants | Switch, Table |
| 18 | `v-subscription` | Plans + sandbox checkout | Card, Badge ("SANDBOX"), Dialog |
| 19 | `v-settings` | Profile, language, theme, consent, export/delete | Switch, AlertDialog |
| 20 | `v-admin` | Admin: review queue, moderation, metrics | Tabs, Table, Badge |

View ids are stable; production App Router routes map 1:1 (`/studio` for `v-studio`, etc.).

## 8. Onboarding tour behavior

First login after registration opens a 4-step tour (skippable, replayable from Settings):
1. Choose language/theme (sets `dir`); 2. Create pregnancy profile and gestational dating
(method shown transparently, 02 §3); 3. One-screen safety promise — what NIVA is and is not
(00 §8 condensed), with emergency numbers surfaced; 4. Guided micro-tour of dashboard and
studio entry. Tour state persists per user; deep-linking into any view works without the
tour.

## 9. Accessibility (target: WCAG 2.2 AA)

- Contrast per section 2 contract; verified with automated contrast checks in the a11y pass.
- Keyboard: every interactive element reachable and operable; logical tab order; no
  keyboard traps (dialogs return focus on close).
- Focus visibility: 2px `--ring` outline with offset on `:focus-visible`, on all themes.
- Target size: project standard 44×44 px minimum for touch targets (meets and exceeds
  WCAG 2.2 target-size minimums).
- ARIA: Radix-based primitives carry roles/names; custom widgets (3D studio, chat) add
  `aria-label`s, live regions for AI streaming, and `role="alert"` for escalation cards.
- Screen-reader text: `sr-only` utilities for icon-only buttons; decorative imagery marked
  `aria-hidden`.
- Forms: labels bound to inputs; errors announced and associated; required indicated in
  text, not color alone.
- Media: 3D has full keyboard alternative and text description (05 §9); toasts duplicate in
  an aria-live region.
- Acceptance for AA is itemized in `09-test-plan.md` §7.

## 10. Component inventory (shadcn/ui New York)

Standard set adopted: Button, Input, Textarea, Label, Select, Checkbox, Switch, Radio
Group, Slider, Calendar, Card, Badge, Alert, Alert Dialog, Dialog, Sheet, Drawer, Tabs,
Accordion, Tooltip, Popover, Dropdown Menu, Command, Table, Progress, Skeleton, Separator,
Avatar, Breadcrumb, Toast/Sonner, Scroll Area, Pagination, Navigation Menu, Sidebar.

Usage rules: toasts via one provider; dialogs for destructive confirmations only; Sheet for
mobile nav; Skeletons mirror final layout (no spinners for primary flows); Badge variants
are semantic — `SANDBOX` badge on all payment surfaces, `DEMONSTRATION` badge on all 3D
asset surfaces, `REVIEW` badge on pending-review admin items.

## 11. Illustration and imagery policy

- Abstract botanical/geometric motifs in the rose/sage/amber palette; no photographic
  imagery of real fetuses, births, or patients.
- The 3D scene is the only fetal imagery and always carries the schematic label
  (ADR-009, 05 §11).
- Illustrations never depict medication, procedures, or anatomy beyond educational
  schematics; they do not imply endorsement by any medical body.
- Every informative image has alt text; decorative ones are hidden from AT.
