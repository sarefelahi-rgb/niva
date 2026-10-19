# NIVA Brand Strategy & Identity

Version 1.0 · Phase 1 deliverable · Owner: Brand Directorate
Status: ratification requested at gate review.

---

## 1. Positioning

| Field | Definition |
| --- | --- |
| **Brand** | NIVA · نیوا |
| **Category** | Premium digital companion for pregnancy, birth, recovery and early parenthood |
| **For** | Expecting and new parents (and their partners/families) who want science they can trust wrapped in care that feels human — first in Persian, then globally |
| **Unlike** | Cluttered ad-driven tracker apps; fear-based "week by week" content farms; clinical portals that feel cold |
| **NIVA is** | The calm, scientifically grounded companion that turns overwhelming weeks into understood weeks |
| **Brand promise** | **Science-backed guidance, deeply human care.** (EN) · «علمِ موثق، مراقبتِ انسانی.» (FA) |

### Competitive differentiation
1. **Scientific calm over alarmism** — evidence-graded content with named reviewers and dates; no arbitrary risk scores, no fake certainty, no fear-based upsells.
2. **Education, never diagnosis** — deterministic emergency guidance independent of AI; the assistant teaches with citations and never pretends to be a physician.
3. **RTL-first craftsmanship** — Persian is a first-class identity (typography, mirroring, numerals, tone), not a translation layer.
4. **A 3D developmental studio** — an original parametric visualization of gestational stages, explicitly educational, never marketed as diagnostic.
5. **Privacy as a feature** — export free for all, consent that can actually be withdrawn, no sale of health data, ever.

## 2. Archetype & Personality

- **Archetype:** The Caregiver, elevated by the Sage. Warm guardian + knowledgeable guide.
- **Personality sliders:** Warm ●●●●●○ Scientific ●●●●○ Calm ●●●●● Trustworthy ●●●●● Intelligent ●●●●○ Inclusive ●●●●● Playful ●●○○○
- **Voice:** speaks *with*, never *at*; short sentences; concrete reassurance; never false certainty ("this is common" only when it is); always names the next safe action.

## 3. Naming & Pronunciation

| | |
| --- | --- |
| Latin | NIVA — pronounced **NEE-vah** (/'niː.vɑː/) |
| Persian | نیوا — «نی‌وا» |
| Meaning intent | evokes "new" (Latin *novus* family) + a soft feminine ending; deliberately gentle, feminine-adjacent but inclusive |
| Conventions | Always capitalized **NIVA** in Latin text; نیوا in Persian. Product surfaces: "NIVA Assistant", "NIVA Studio". Never "Niva.ai", never ALL-lowercase in formal surfaces. |

## 4. Messaging Framework

**House:** *Understand every week.* (هر هفته را بشناس.)

| Pillar | EN message | FA message |
| --- | --- | --- |
| Science | "Every answer carries its sources and review date." | «هر پاسخ، منابع و تاریخ بازبینی خود را همراه دارد.» |
| Calm | "No alarm scores. Just what the evidence says — and what to do next." | «بدون امتاب‌های نگران‌کننده. فقط آنچه شواهد می‌گویند — و قدم بعدی امن.» |
| Privacy | "Your data is yours: export it free, delete it forever, withdraw consent anytime." | «داده‌های شما مال شماست: خروجی رایگان، حذف همیشگی، لغو رضایت در هر زمان.» |
| Family | "Invite who you choose. Revoke with one tap." | «هر کس خواستید دعوت کنید. با یک لمس لغو کنید.» |
| Safety | "Red-flag guidance is built-in, independent of AI, and always free." | «راهنمای علائم هشدار، مستقل از هوش مصنوعی و همیشه رایگان است.» |

**Microcopy rules:** verbs first ("Save", نه "Click here"); errors state cause + next step; never blame; pregnancy never described as a condition to "fix"; no exclamation marks in medical content; max 1 emoji per non-medical surface.

## 5. Tone of Voice (EN + FA)

| Context | Tone | Example |
| --- | --- | --- |
| Dashboard daily | warm, brief | "Week 22 — your baby is about the size of a papaya." |
| Emergency | direct, calm, no decoration | "Contact emergency services now." |
| Billing | transparent, plain | "Cancel anytime. Access continues to period end." |
| Community | protective, clear | "Held for moderation — nothing here replaces your clinician." |

Persian tone: محترمانه و گرم («شما» همیشگی)، بدون ادعای پزشکی؛ اعداد با ارقام فارسی در متن فارسی.

## 6. Editorial Imagery Strategy

- Authentic, diverse families and body types; no sexualized or exploitative pregnancy imagery; no needles/surgery close-ups in marketing surfaces.
- Medical illustrations always carry the educational disclaimer and reviewer attribution.
- 3D visual language ("Calm Bloom" soft studio lighting, matte materials, warm rim light) — shared with the fetal studio so brand and product feel like one world. The studio is illustrative education, never "diagnostic reconstruction".
- No stock photos implying medical endorsement ("doctor approves") — that endorsement does not exist.

## 7. Logo System ("Cradle Bloom")

| Asset | File | Use |
| --- | --- | --- |
| Monogram (squircle + cradle arc + seed) | `public/logo-mark.svg` | App icon, favicon source, avatar fallback |
| Horizontal lockup (mark + NIVA + نیوا) | `public/logo.svg` | Landing header, documents, admin |
| App icons (rendered from the same vector) | `public/icon-192/512/1024.png` | PWA manifest, store listings |

Construction rules: mark is always the squircle with gradient `#8b7cc4 → #7a6bb5 → #e08d7a` at 26/96 corner radius; cradle arc stroke 9/96 white @95%; seed dot ivory `#fff6ec` with coral highlight @55%. Clear space = ½ mark height. Minimum sizes: mark 24px, lockup 120px width. Never rotate, never outline, never recolor outside the documented gradients.

Favicon: the monogram rendered at 32px (PNG export from the same SVG).

## 8. Palette — "Calm Bloom" (WCAG-validated)

Primary **sophisticated lavender** `oklch(0.56 0.105 300)` · canvas **warm ivory** `oklch(0.975 0.008 95)` · accent **muted coral** `oklch(0.72 0.11 40)` (tint surfaces `oklch(0.91 0.045 40)`) · support **sage** `oklch(0.66 0.06 150)` · neutrals: plum-charcoal `oklch(0.27 0.02 300)`.

Measured contrast (WCAG 2.2 relative luminance, oklch→sRGB pipeline; script evidence in worklog):

| Pair | Ratio | Grade |
| --- | --- | --- |
| plum text / ivory bg | **14.10:1** | AAA |
| ivory / lavender (buttons) | **4.64:1** | AA |
| muted text / ivory | **6.40:1** | AA |
| plum / sage chips | **5.38:1** | AA |
| coral-tint fg / coral tint | **9.50:1** | AAA |
| white / destructive | **5.23:1** | AA |
| dark ivory / violet-charcoal | **14.79:1** | AAA |
| dark text / luminous lavender | **7.91:1** | AAA |
| dark muted / charcoal | **6.81:1** | AA |
| dark ivory / deep sage | **6.17:1** | AA |
| dark coral-tint / coral ember | **9.06:1** | AAA |
| dark on destructive | **5.73:1** | AA |

All 12 pairs ≥ 4.5:1 → **WCAG 2.2 AA pass** for the complete token set (both themes).

## 9. Typography

| Role | Font | License | Delivery |
| --- | --- | --- | --- |
| Persian/RTL primary | **Vazirmatn Variable** (100–900) | SIL OFL 1.1 | self-hosted `public/fonts/Vazirmatn-var.woff2` |
| Latin/EN primary | **Inter Variable** (100–900) | SIL OFL 1.1 | self-hosted `public/fonts/Inter-var.woff2` |

- `--font-niva-rtl` applied on `[dir="rtl"]`/`html[lang="fa"]`; `--font-niva-sans` elsewhere. Both defined in `globals.css` `:root` (audit fix R-09: tokens were referenced but never defined).
- Scale (1.25 ratio): 12 / 14 / 16 (base) / 20 / 24 / 30 / 38 / 48. Weights: 400 body, 500 emphasis, 700 headings; Persian headings 600–700.
- Numerals: Persian text uses Persian digits via locale formatting; `.num` class keeps tabular LTR numerals inside RTL sentences.

## 10. Motion Language

- Motion tokens: `--motion-fast 150ms`, `--motion-base 250ms`, `--motion-slow 600ms`; easing `cubic-bezier(0.22, 1, 0.36, 1)` (calm exit), `cubic-bezier(0.4, 0, 0.2, 1)` (utility).
- Signature motion: gentle "breathe" scale (1.00→1.015) on hero/studio idle; page transitions fade+8px rise; NO bouncing, NO decorative spinners.
- `prefers-reduced-motion` (and `.niva-reduce-motion`) collapses all to ≤0.01ms — already enforced globally.

## 11. Iconography & Illustration

- Icons: **Lucide** (1.5px stroke, rounded) — the app standard; size 20 UI / 24 nav; never mix filled+outline on one surface.
- Emoji is not iconography: replace emoji-as-icon (🔒☀️👋) with Lucide equivalents (Phase 2 sweep).
- Illustration: soft organic shapes, 8–24% lavender/coral tints, no hard shadows; 3D assets follow ADR-006.

## 12. Asset Export Specifications

| Asset | Spec |
| --- | --- |
| App icon (PWA) | 192/512/1024 PNG from `logo-mark.svg` (sharp, density 1200) — manifest corrected with true sizes + maskable |
| Favicon | 32px PNG + SVG shortcut |
| Social card | 1200×630 PNG, lockup on ivory + soft bloom gradient (Phase 2) |
| Store icon | 1024 PNG, no transparency |
| Email logo | lockup PNG @2x, 40px height |
| 3D stills | 2048px, brand rim light, alt text mandatory |

## 13. Acceptance (Phase 1)

- [x] Tokens v2 implemented in `globals.css` (both themes) — all 12 text pairs ≥4.5:1 measured, not assumed
- [x] Self-hosted fonts actually load (verify computed styles in browser during gate test)
- [x] Original logo system + app icons rendered from the same vector — no third-party/unlicensed assets
- [x] Manifest corrected (R-18) — true sizes, maskable, brand theme color `#7a6bb5`
- [x] Brand strategy + this design system documented (EN with FA voice tables)
