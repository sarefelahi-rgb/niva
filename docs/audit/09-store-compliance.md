# 09 — Store Compliance (Google Play & Apple App Store)

Wave 6.5 · NIVA maternal-health platform · Prepared from the actual codebase (paths and behaviors cited inline). Everything marked **[release-task]** is a deliberate open item for the release wave — nothing is fabricated.

---

## 1. Google Play — Data safety form (mapped to real data flows)

Answer each form question from this table. "Collected" = leaves the device to NIVA servers; "shared" = sent onward to a third party.

| Form data type | What NIVA actually collects | Where it lives (model / route) | Shared with third party? |
|---|---|---|---|
| Personal info — name, email | email, name, locale, role | `User` (`/api/auth/register`, `/api/auth/login`) | No |
| Health & fitness — pregnancy info | gestational week, due date, week-bucketed tracking | `Pregnancy`, tracking views (`/api/tracking/*`) | No |
| Health & fitness — journal / mood | free-text diary + mood enum (Art. 9 sensitive data) | `JournalEntry` (`/api/journal`) | No |
| Health & fitness — birth / postpartum logs | contractions, feeding sessions, birth-prep checklist | `ContractionSession`, `FeedingLog`, birth-prep prefs | No |
| App activity — AI chat content | prompts + answers with citations; **content is processed by the LLM provider (z-ai-web-dev-sdk) server-side via `src/lib/ai-gateway.ts`** — this counts as processing by a service provider, and the Data Safety form's "app functionality" purpose | `AIConversation`, `AIMessage` (`/api/ai/*`) | Yes — LLM provider (service provider; see §4 for what is *not* sent) |
| App info & performance — diagnostics | PHI-free usage telemetry: hashed `userId` (HMAC-SHA256 prefix), char counts, retrieval scores, error codes — **never message content** | `AIUsageLog` (`src/lib/ai-observability.ts`) | No |
| Financial info — purchase history | plan, status, amount (minor units), currency, provider refs, idempotency keys. **Card data never touches NIVA** (PSP-hosted flow, ADR-008; `Payment.provider` default `SANDBOX` until the real PSP adapter lands — Wave 6.1) | `Subscription`, `Payment`, `Invoice`, `Refund` | Yes — PSP (hosted payment) |
| Device / other — push tokens | push endpoint URL + Web Push key material (`p256dh`, `auth`), locale | `PushSubscription` (`/api/push/subscribe`) | Yes — the browser push service (FCM / Mozilla autopush) receives messages |
| Community content | pseudonymous posts (`authorAlias`) + moderation state | `CommunityPost`, `ModerationAction` | No |

**Form answers derived from the table:**
- *Is data encrypted in transit?* **Yes** — all traffic over HTTPS (session cookies are `httpOnly`, `secure` when HTTPS — `src/lib/auth.ts`; production origin from `NIVA_PUBLIC_URL`).
- *Can users request data deletion?* **Yes** — in-app account erasure with cascade: `POST /api/privacy/delete` (identity is nullified in audit/safety rows via `onDelete: SetNull`; financial rows are anonymize-not-delete per statutory retention — documented in `docs/audit/07-privacy-pack.md`).
- *Data export* — `GET /api/privacy/export` (also satisfies Apple's data-portability expectations).

## 2. Apple — privacy "nutrition labels" (equivalent mapping)

| Label category | NIVA answer |
|---|---|
| Contact Info → email, name | Collected — account purposes, not linked to third-party tracking |
| Health & Fitness → health records, fitness | Collected — app functionality only; never used for tracking/ads |
| User Content → other user content (journal, community posts, AI chats) | Collected — app functionality; community content is pseudonymous |
| Purchases → purchase history | Collected — app functionality |
| Diagnostics → other diagnostics | Collected — PHI-free telemetry only (hashed IDs, counts, scores) |
| Identifiers → device/device ID | Push token collected — app functionality (reminder delivery) |
| Tracking across apps/websites | **Not collected. No ad SDKs, no analytics trackers, no third-party font CDN (self-hosted OFL fonts).** |

## 3. Medical-app review notes (Guideline 1.4.1-style — physical harm review)

- **Positioning: educational, not medical.** The disclaimer is persistent in the app footer on every view (`t('landing.disclaimer')`): EN *"NIVA is an educational platform, not a medical device. It does not diagnose, prescribe, or replace professional care."* / FA *"نیوا یک پلتفرم آموزشی است، نه وسیله پزشکی. تشخیص نمی‌دهد، تجویز نمی‌کند و جایگزین مراقبت حرفه‌ای نیست."* (`src/lib/i18n.ts:40,432`).
- **Assistant disclaimer** shown in the AI assistant view (`t('assist.disclaimer')`): *"Educational use only. Not a diagnosis. Always consult your clinician."* (`src/lib/i18n.ts:153`).
- **Dashboard disclaimer** (`t('dash.disclaimer')`): *"Educational content — pending clinical review badge shown where applicable."* Clinical-review status is surfaced on content that has not completed review.
- **No diagnosis claims:** the assistant is retrieval-grounded (versioned knowledge base `src/data/kb-v2.ts`, per-answer citations) with safety-level gating, injection screening, and refusal paths (`src/lib/rag.ts`, `src/lib/ai-gateway.ts`); red-flag symptom handling routes users to professional care (SafetyEvent pipeline).
- **Push notifications are reminders only** (appointments, due-date nudges) built from user-created rows — they never deliver medical advice or diagnosis content.
- **3D studio is an educational visualization** (labeled "Educational visualization / نمایش آموزشی"), not a diagnostic imaging tool; assets pass a clinical review state machine before publication (`/api/assets/review`).

## 4. Security practices (cited in both stores' forms)

- HTTPS everywhere; `httpOnly`/`SameSite` session cookies; scrypt password hashing.
- Same-origin (CSRF) enforcement + zod validation on all 30 mutating routes (see `docs/audit/05-bounded-contexts.md`).
- Web Push uses VAPID-signed requests; private key is server-only (`src/lib/push-server.ts`, env `NIVA_PUSH_VAPID_PRIVATE_KEY` — never exposed; `/api/push/config` returns the *public* key only).
- **`/api/*` responses are never cached by the service worker** (`public/sw.js` — privacy by design); only the app shell and immutable build assets are cached, budget-capped (≤ ~5 MB total, runtime cache ≤ 80 entries).
- AI provider receives only the bounded prompt (≤ 6 000 chars) — never credentials, payment, or identity data; usage logs are content-free by construction.

## 5. Store assets checklist

| Asset | Status | Path / note |
|---|---|---|
| App icon 192×192 | ✅ produced | `public/icons/icon-192.png` |
| App icon 512×512 | ✅ produced | `public/icons/icon-512.png` |
| Adaptive/maskable icon 512 | ✅ produced | `public/icons/maskable-512.png` (`purpose: maskable` in `src/app/manifest.ts`) |
| Apple touch icon | ✅ produced | `public/icons/apple-touch-icon.png` (referenced from `src/app/layout.tsx`) |
| Favicon 32 | ✅ produced | `public/icons/favicon-32.png` |
| Web manifest | ✅ live route | `/manifest.webmanifest` (Next metadata route `src/app/manifest.ts`; `dir: rtl`, `lang: fa`) |
| OG/hero image | ✅ exists | `public/hero.png` (1024×1280, referenced in layout OpenGraph) |
| Phone screenshots (Play: min 2; App Store: per-device sets) | **[release-task]** | Must be real device captures of the production build — do NOT fabricate |
| 7" / 10" tablet screenshots | **[release-task]** | same |
| Feature graphic 1024×500 (Play) | **[release-task]** | design pass |
| Apple App Privacy answers | ✅ derivable | §2 above |
| Play Data safety form | ✅ derivable | §1 above |
| Content rating questionnaire (health reference, no user-gen UGC risk category beyond community) | **[release-task]** | reviewer walkthrough |
| Privacy policy URL | **[release-task]** | host `docs/07-privacy-pack.md` summary as a public page |
| Account-deletion disclosure (Play policy) | ✅ in-app | `POST /api/privacy/delete` + settings entry point |

## 6. Submission checklist (pre-flight)

1. [ ] Real PSP adapter live (`Payment.provider` ≠ `SANDBOX`) and Data-safety "Financial info" answers re-verified against the production PSP's data flow.
2. [ ] Screenshots + feature graphic captured from release build (**[release-task]** §5).
3. [ ] VAPID keys rotated from sandbox values to production secrets; `NIVA_PUSH_SUBJECT` set to a monitored mailbox.
4. [ ] Browser E2E: subscribe → receive → tap-through on real Android (Chrome) and iOS (Safari 16.4+ home-screen web push) devices.
5. [ ] Offline smoke: airplane-mode cold start renders the cached shell (`/` fallback).
6. [ ] SW update drill: bump `SW_VERSION`, confirm update toast + refresh applies the new worker.
7. [ ] Clinical sign-off on KB v2 + disclaimers wording (backlog 6.6).
8. [ ] Privacy policy page hosted; Play Data safety + Apple labels finalized from §1–§2.

---

*Honesty notes: no screenshots/feature graphic exist in-repo (intentionally); iOS push requires the user to add NIVA to the home screen (Safari limitation, surface in onboarding copy — **[release-task]**); `Payment.provider` remains `SANDBOX` until Wave 6.1's real adapter ships.*
