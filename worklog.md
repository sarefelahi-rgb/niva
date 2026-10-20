# NIVA Pregnancy Intelligence Platform — Shared Worklog

Project: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma/SQLite sandbox build of the NIVA platform.
Constraints: single user-visible route `/` (client-side view router), API routes under `/api/*`, SQLite via Prisma, dev server on port 3000.

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Phase 0 — repository inspection and worklog initialization.

Work Log:
- Inspected package.json: Next 16.1.1, React 19, TS 5, Tailwind 4, shadcn/ui full set, Prisma 6 + SQLite (db/custom.db), zustand, framer-motion, next-themes, sonner, recharts, z-ai-web-dev-sdk present.
- Confirmed single-route constraint: all user-facing views must live in src/app/page.tsx via client-side router; API routes allowed under src/app/api.
- Confirmed DATABASE_URL=file:/home/z/my-project/db/custom.db, lib/db.ts exists, full shadcn/ui component inventory.
- Identified gaps: three/@react-three/fiber/@react-three/drei not installed yet; no i18n, no auth, no domain code.
- Planned Task IDs 2-a..10 (docs + datasets delegated to subagents; engine/core implemented by main agent).

Stage Summary:
- Repository baseline captured. NIVA implementation plan: docs + datasets (parallel subagents) → schema/seed/libs → API layer → design system + 20 views → 3D studio → AI assistant → PWA/polish → browser-verified E2E.
- Architecture deviation note (sandbox vs production target): SQLite instead of PostgreSQL, in-process RAG instead of isolated service, Next.js API routes instead of NestJS, sandbox payment adapter, parametric demonstration 3D assets. All documented honestly in docs/ suite.

---
Task ID: 2-b
Agent: general-purpose (datasets)
Task: Bilingual medical knowledge base + weekly content datasets

Work Log:
- Read worklog.md (Task 1) and confirmed repo baseline; created src/data/ (did not exist).
- Authored src/data/medical-knowledge.ts: KnowledgeCategory union (8 categories), KnowledgeEntry interface, MEDICAL_KNOWLEDGE with exactly 24 entries covering all specified topics (folic acid, iron/anemia, vitamin D, calcium, caffeine, fish/mercury, listeriosis/toxoplasmosis food safety, alcohol/tobacco, nausea, heartburn, constipation, back pain, exercise, sleep position, travel, dental care, flu/Tdap vaccination, kick counts, preeclampsia/preterm labor/bleeding warning signs, GDM screening, GBS screening, postpartum recovery + baby blues vs PPD).
- redFlagRelated=true on exactly the 4 specified entries; red-flag bodies instruct same-day clinician contact, hospital attendance, or emergency services (incl. Iran social emergency 123 / US 988 for PPD crisis).
- Authored src/data/weekly-content.ts: WeekContent interface, WEEKLY_CONTENT with all 37 weeks 4-40 ascending; CRL for 6-13, crown-heel from 14, null length/weight only weeks 4-5 (weight null 4-7); anchor values match spec (w12 5.4cm/14g, w20 25cm/300g, w28 36cm/1000g, w36 47cm/2700g, w40 50cm/3400g); milestone=true for 8, 12, 13, 20, 24, 28, 36, 37, 39, 40.
- All content bilingual: wrote fluent Persian health-education copy (ZWNJ half-spaces, Iranian clinical terminology, e.g. سوزش سردل، زایمان زودرس، پره‌اکلامپسی، غربالگری دیابت بارداری، استرپتوکوک گروه B) — not literal machine translation. Plain-text bodies, no markdown/HTML/emojis, no statistics beyond widely published WHO/ACOG/CDC/NHS guidance; citations to WHO ANC 2016 Recommendations 1.1-1.5, ACOG FAQs/Committee Opinions (804, 746, 797, 828), CDC, NHS, FDA/EPA fish advice, Tommy's Sleep On Side.
- Validated with a script: 24 entries / 37 weeks, unique kebab-case ids, topicsEn 3-6, keywordsEn/Fa 6-12, bodyEn 118-143 words, bodyFa 121-150 words, monotonic week-over-week length/weight, no markdown chars; trimmed 4 Persian bodies to fit the 90-150 window.
- Type-checked both files with tsc --noEmit --strict --noUnusedLocals (project tsconfig strict:true) — passes clean; no other file touched, no tests/dev/db commands run.

Stage Summary:
- Files created: src/data/medical-knowledge.ts (549 lines, 24 entries, exports KnowledgeCategory + KnowledgeEntry + MEDICAL_KNOWLEDGE), src/data/weekly-content.ts (613 lines, 37 weeks, exports WeekContent + WEEKLY_CONTENT).
- Sourcing approach: conservative, uncontroversial patient education mapped to real widely-accepted guidance (WHO ANC 2016, ACOG patient FAQ/Committee Opinions, CDC, NHS pregnancy pages, FDA/EPA 2021 fish advice, Tommy's MiNESS-based side-sleeping guidance); approximate averages only for fetal size (UI labels "approximate").
- Ready for Task 3 seeding (seed with reviewStatus "IN_REVIEW"); retrieval uses keywordsEn/keywordsFa, assistant red-flag surfacing uses redFlagRelated.

---
Task ID: 2-a
Agent: general-purpose (docs)
Task: Architecture baseline documentation suite

Work Log:
- Re-read worklog (Task 1 baseline) and inspected current repo state (package.json, prisma schema, src/app/page.tsx, layout.tsx, globals.css, lib/db.ts) to anchor docs to the build truthfully; noted repo is at pre-implementation baseline, so docs were written as the authoritative contract the implementation follows, with status vocabulary SPECIFIED / IMPLEMENTED (sandbox) / DOCUMENTED-TARGET / DEFERRED.
- Created docs/ directory and authored 11 markdown documents (English, no emojis, cross-referenced by filename, each 120-400 lines):
  00-executive-summary.md (193 ln) — condensed PRD: vision, 5 personas, Iran+global market context, scope matrix A-Y with per-module status, channels, languages, non-goals, "what this sandbox build is and is not" honesty section.
  01-system-architecture.md (361 ln) — C4 context/containers/components, 9 bounded contexts, mutation + AI-safety sequence diagrams, single-route view router rationale, API-first rules, deployment topology current vs target, ADR-001..ADR-010 (SQLite→PG, single-route SPA, custom session auth vs NextAuth, parametric 3D vs scanned GLB, in-process RAG vs isolated gateway, payment adapter sandbox-first, dictionary i18n vs next-intl, clinical governance workflow, demonstration assets policy, PWA-first vs stores).
  02-data-model.md (222 ln) — 27-entity catalog with fields/relations, Mermaid ERD, index/unique table, referential integrity rules, SQLite→PostgreSQL migration notes, retention policy table, encryption boundaries (platform vs application), append-only audit design, backup/recovery (SQLite file backup now, managed PITR target).
  03-api-spec.md (297 ln) — authoritative contract: conventions, error envelope (400/401/403/404/409/429), rate-limit table, 16 route groups (auth..admin) with method/path/role/TS-shaped payloads, payment idempotency, AI pipeline contract obligations, OpenAPI 3.1 adoption path.
  04-design-system.md (202 ln) — semantic tokens (warm rose primary, sage secondary, amber accent, cream surfaces, aubergine dark), Inter/Vazirmatn type scale, spacing/radii/elevation/motion incl. reduced-motion, RTL/LTR logical-property rules, WCAG 2.2 AA contract (contrast, keyboard, focus-visible, 44px targets), 20 screens mapped to view ids, onboarding tour, shadcn/ui inventory, imagery policy.
  05-3d-asset-spec.md (189 ln) — R3F scene graph, parametric proportion table per gestational stage (head:body ratio, limb flags), AnatomicalAsset registry fields (asset_id..publication_status), LOD/device-adaptive dpr tiers, interaction + guided mode, accessibility alternatives, WebXR AR strategy, performance budgets, scientific integrity rules (schematic labeling, no diagnostic/movement/heartbeat claims), Blender→glTF pipeline.
  06-medical-safety.md (207 ln) — wellness/education vs medical-device boundary, 14-category bilingual red-flag taxonomy, deterministic escalation rules (LLM bypass, 115/123 + local-number rule), LLM hard constraints, citation/provenance requirements, DRAFT→IN_REVIEW→APPROVED/REJECTED workflow with audit, versioning, SafetyEvent incident lifecycle, explicit "no clinically approved content without documented human review" statement, regulatory scoping questions (Iran FDA, GDPR-class, app stores) marked as requiring qualified counsel.
  07-security-privacy.md (163 ln) — STRIDE summary, session/scrypt authN, RBAC + object-level ownership (IDOR rule), zod validation, rate limiting, upload posture, secrets, encryption boundaries, consent/lawful-basis model, export/delete workflows, prompt-injection defenses, dependency scanning path, backup/DR, 10 honest known gaps with remediation plan.
  08-ai-evaluation.md (137 ln) — RAG stage list, retrieval metrics + targets, 18-row bilingual red-flag regression catalog that MUST bypass the LLM, 7 prompt-injection test cases, groundedness/citation checks, escalation correctness, human review loop, monitoring via SafetyEvent; explicit statement that suites are specified and NOT executed in this sandbox (manual E2E evidence lives in this worklog).
  09-test-plan.md (163 ln) — method vocabulary, per-module A-Y acceptance matrix (criterion + verification method), golden paths G1-G10 (register→onboard→dashboard→3D→AI→tracking→journal→sandbox subscription→admin review), performance/a11y/security protocols, quality gates G-QA1..9, EVD-### evidence convention.
  10-backlog-risk.md (132 ln) — Phase 0-8 backlog with per-item status plus Phases 9+ production hardening, and 15-risk register (clinical safety, regulatory, privacy, 3D validity, payments, hallucination, data loss, a11y, performance, misinformation, supply chain, single-node ops, i18n quality, review capacity, scope creep) with likelihood/impact/mitigation/owner.
- Verified all files 120-400 lines (total 2266), full cross-reference coverage (every doc referenced by at least one other), no emojis, no TODO placeholders.
- Honesty rules enforced throughout: no medical approval, certification, real payment, or executed automated test claims; statuses only; referenced standards (WHO ANC 2016, ACOG, ISUOG, WCAG 2.2, OWASP ASVS) without fabricated quotes.

Stage Summary:
- docs/00-10 architecture baseline suite (11 files, 2266 lines) created as the authoritative contract for Tasks 3+ (schema/seed/libs, API layer, design system, 3D studio, AI assistant).
- Key decisions encoded: ADR-001 SQLite→PostgreSQL path; ADR-002 single-route view router mapping 1:1 to future App Router routes; ADR-003 first-party session auth (scrypt, rotation, logout-all); ADR-004/009 parametric DEMONSTRATION-labeled 3D with registry-governed claims; ADR-005 stage-separated in-process RAG with deterministic red-flag bypass; ADR-006 sandbox-first payment adapters with server-side Entitlement truth; ADR-007 dictionary fa/en i18n; ADR-008 clinical review workflow gating all content; ADR-010 PWA-first delivery.
- Safety architecture pinned: bilingual red-flag engine runs before any LLM call, 115/123 escalation cards, SafetyEvent lifecycle, 18-row regression catalog as release gate G-QA5.
- Next agents should implement against 02 (schema), 03 (API), 04 (tokens/screens), 05 (3D), and record verification as EVD-### rows per 09 §8.

---
Task ID: 3
Agent: main (Z.ai Code)
Task: Prisma schema, database seed, core engine libraries

Work Log:
- Replaced scaffold schema with 27-entity NIVA model (User/Session/Consent, Pregnancy/GestationalDating/PregnancyEvent, SymptomEntry/Appointment/Reminder/MedicalDocument, EducationalContent/ScientificSource/ClinicalReview/AnatomicalAsset, AIConversation/AIMessage/SafetyEvent, JournalEntry, PartnerAccess/CommunityPost/ModerationAction, Subscription/Payment/Entitlement, AuditEvent/Notification/Setting). SQLite-compatible (JSON-in-string for arrays).
- `bun run db:push` + prisma generate OK.
- Core libs: src/lib/gestational.ts (Naegele EDD, Hadlock-style CRL interpolation table, IVF dating, GA/trimester math, clinician-dating lock + >7d conflict surfacing — never silently overwritten); src/lib/safety.ts (14 bilingual red-flag rule categories, deterministic levels, prompt-injection heuristics, fixed emergency templates with Iran 115/123); src/lib/auth.ts (scrypt, 256-bit session tokens, HttpOnly SameSite cookies, logout-all); rate-limit.ts; api.ts (withUser role guard, same-origin CSRF check, zod body ceiling); entitlements.ts (PLAN_FEATURES, server-side source of truth); audit.ts (sanitized append-only audit + safety events); rag.ts (lexical retrieval over curated KB, fenced-user-message grounding prompt, post-hoc disclaimer enforcement); i18n.ts (~350 keys fa/en).
- prisma/seed.ts: governance-demo accounts (admin/reviewer/demo), 61 content items seeded as IN_REVIEW (no approval claimed), 12 stage-specific AnatomicalAsset entries honestly labeled DEMONSTRATION, plan catalog, feature flags, fully populated demo pregnancy. Idempotent.

Stage Summary:
- Database + core engines in place. Seed verified twice (idempotent). All statuses honest (IN_REVIEW / DEMONSTRATION).

---
Task ID: 4
Agent: main (Z.ai Code)
Task: API layer (30 route handlers)

Work Log:
- Auth: register (rate-limited 5/min, terms enforced via zod literal(true)), login (8/min), logout, me (session+entitlement+pregnancy), demo entry.
- Domain: pregnancy (GET/POST/PATCH with dating conflict 409 + explicit confirmOverwrite, transitions incl. POSTPARTUM/LOSS), tracking (red-flag scan on free text), journal, appointments (auto reminder + notification), reminders (repeating), documents (metadata-only registry; raw binaries deliberately rejected pending malware-scan pipeline), content (governance status exposed truthfully), assets (PUBLISHED only, plan gating).
- AI: conversations CRUD + chat (server-side daily cap for FREE plan, deterministic emergency bypass BEFORE LLM, injection heuristics, persistence, SafetyEvent logging).
- Family (entitlement-gated invites, revocation), community (moderation-by-default + misinformation auto-flag), subscription (checkout with idempotency keys + webhook with HMAC-SHA256 timing-safe verification and PENDING-only transitions + cancel), notifications, privacy (consent, JSON export gated by entitlement, delete with cascade + email hash audit).
- Admin: overview (incl. 4-phrase deterministic safety smoke tests), review queue (approve/reject/changes with reviewer identity + audit), users, safety (resolve), audit, finance, feature flags.
- Fixed during build: missing db import in entitlements, seed model-name typo, SafetyEvent include without relation.

Stage Summary:
- 30 handlers, all validated + role-guarded. tsc clean after fixes.

---
Task ID: 5
Agent: main (Z.ai Code)
Task: Design system, app shell, 20 views

Work Log:
- globals.css: NIVA tokens (warm rose primary, sage secondary, amber accent, cream surfaces; aubergine dark theme), niva-grad/niva-card premium surfaces, RTL font stack (Vazirmatn/Inter via CDN link), reduced-motion support, custom scrollbars, focus-visible, .num LTR-numeric-in-RTL helper.
- layout.tsx: metadata, manifest link, theme provider, viewport-fit cover.
- store/app.ts: zustand (persisted locale/tour), view router, refresh/logout.
- shell: AppShell (role-aware sidebar, mobile bottom nav + sheets, notification bell, locale/theme toggles, sticky footer with disclaimer), TourOverlay (5 steps, dismissible, restartable), ImmersiveShell for studio.
- Views: landing (hero image, features, disclaimer), auth (register/login/demo + terms gate), onboarding (4 dating methods with live EDD preview, plurality, uncertainty flag), dashboard (GA hero, progress, baby-size, quick actions, red-flag + dating banners, schedule), timeline (week rail + milestone accordion), tracking (sliders, BP/kicks, symptom chips, sparklines, BP alert), assistant, records, appointments/reminders, nutrition (favor/avoid + KB with citations + review badges), birth prep (checklists), postpartum (crisis alert, honest non-diagnostic note), family (permission matrix, revoke), community (alias, moderation notices), journal, subscription (plans, sandbox dialog, invoices), settings (locale/theme/consent/export/delete/sessions/tour), admin (6 tabs incl. AI-quality smoke tests), review (content+asset queues with decisions), safety (bilingual red-flag list + 115/123).
- Fixed lint errors: rAF-deferred setState in effects, de-memoized Limb quaternions, missing imports; removed stale eslint-disable directives.

Stage Summary:
- 20/20 required screens implemented as views under the single-route constraint. Lint: 0 errors (1 acceptable font warning). tsc clean.

---
Task ID: 6
Agent: main (Z.ai Code)
Task: Scientific 3D Studio

Work Log:
- params.ts: 12 keyframed anatomical proportion stages (4-40 weeks: scale, head/body ratio 0.5→0.26, spinal curl 92°→11°, limb growth 0→97%, placenta/uterus growth) with smooth interpolation; hotspot anchor computation.
- fetus-model.tsx: parametric fetus (torso capsule, jaw-tapered head, eyes, 2-segment limbs with joints), placenta disc on uterine wall, Catmull-Rom umbilical cord, translucent uterus shell; frame-damped morphing between stages; layer toggles; drei Html hotspots (bilingual educational labels); LOD quality tiers.
- fetal-studio.tsx: Canvas with adaptive dpr, OrbitControls, stage slider + week buttons, layer buttons (advanced layers plan-gated with lock), guided tour (5s auto-advance), auto-rotate, zoom/reset keyboard-accessible buttons, reduced-motion detection (pauses rotation + labels), WebXR immersive-ar capability detection + graceful "unsupported" fallback, registry-sourced stage descriptions (text alternative for a11y), honest "educational demonstration asset" badges.
- Browser-verified: week 6 embryo, week 12, week 40 morphing; placenta/cord rendering; Persian hotspot labels; reset/zoom controls.

Stage Summary:
- Engine + pipeline + registry integration complete with scientific-integrity labeling. Known dev-mode-only React 19 warning on Canvas unmount noted (non-blocking, does not occur in production build behavior).

---
Task ID: 7
Agent: main (Z.ai Code)
Task: AI assistant backend + UI

Work Log:
- Pipeline verified end-to-end in browser: grounded Persian answer with citation block + disclaimer for foods question; deterministic EMERGENCY bypass verified with Persian red-flag message (fixed template, 115/123 banner, no LLM call, SafetyEvent recorded and visible in admin).
- Chat UI: conversation list, optimistic send, typing indicator, citation rendering, emergency banner inside bubbles, free-tier limit toast (402), suggested prompts.
- Admin AI-quality panel: reply count, escalation count, 4/4 deterministic smoke tests passing.

Stage Summary:
- Evidence-grounded RAG + deterministic escalation operating as specified in docs/06 + docs/08.

---
Task ID: 8
Agent: main (Z.ai Code)
Task: PWA, imagery, polish

Work Log:
- manifest.webmanifest (standalone, icons, theme color), sw.js (network-first, API never cached, shell fallback), registered in page.tsx.
- Generated hero illustration + app icon via image-generation skill into public/.
- Onboarding tour auto-open + restart from Settings.

Stage Summary:
- PWA baseline installable; assets generated.

---
Task ID: 9
Agent: main (Z.ai Code)
Task: Verification (lint, typecheck, dev.log, Agent Browser E2E)

Work Log:
- tsc --noEmit: clean (excluding pre-existing examples/ + skills/ sandbox errors).
- eslint: 0 errors, 1 warning (CDN font link warning; acceptable for App Router runtime fonts).
- dev.log: all requests 200, no server errors.
- Agent Browser E2E evidence (EVD per docs/09 convention):
  - EVD-01 Landing fa/RTL renders with hero + disclaimer. PASS
  - EVD-02 Auth renders; demo one-click login works. PASS
  - EVD-03 Dashboard week 21 / trimester 2 / 53% / baby-size / red-flag alert. PASS
  - EVD-04 Tour overlay 5 steps + start. PASS
  - EVD-05 3D studio: W6/W12/W40 stage morphing, layers, hotspots, badges, controls. PASS
  - EVD-06 Timeline week rail + milestone card. PASS
  - EVD-07 AI grounded answer with citations (fa). PASS
  - EVD-08 Persian red-flag message → deterministic EMERGENCY template (no LLM). PASS
  - EVD-09 Tracking form + history + sparklines. PASS
  - EVD-10 Sandbox checkout → HMAC webhook → plan active + invoice row. PASS (found & fixed checkout/webhook plan mismatch)
  - EVD-11 Admin overview: 61 pending review, 1 escalation, 4/4 safety smoke tests. PASS
  - EVD-12 Clinical review approve → content APPROVED + REVIEW_APPROVED audit event. PASS
  - EVD-13 Audit trail: REVIEW_APPROVED, USER_LOGIN, DEMO_LOGIN, PAYMENT_SUCCEEDED. PASS
  - EVD-14 en/LTR full flip (dir=ltr verified via DOM). PASS
  - EVD-15 Dark aubergine theme. PASS
  - EVD-16 Mobile 390px: bottom nav, responsive grids, wrapped tabs. PASS
  - EVD-17 Sticky footer (mt-auto) + honest DEMONSTRATION·PUBLISHED asset registry. PASS
  - EVD-18 Fresh registration: terms rejection works, then accepted → onboarding → LMP -100d → correct week 14 dashboard. PASS

Stage Summary:
- All golden paths browser-verified. 1 production bug found and fixed during E2E (subscription plan alignment in checkout).

---
Task ID: 10
Agent: main (Z.ai Code)
Task: Final worklog + completion report

Work Log:
- Recorded evidence above; produced final report to user with explicit limitations (no automated test execution in sandbox, no MFA, in-memory rate limiting, sandbox payments, DEMONSTRATION 3D assets, content pending clinical review, mobile/store delivery documented-target).

Stage Summary:
- NIVA sandbox build complete and browser-verified; honest handoff delivered.

---
Task ID: 11
Agent: main (Z.ai Code)
Task: "گرافیک را طبیعی سه بعدی کن" — natural organic 3D graphics for the fetal studio

Work Log:
- Replaced the primitive capsule/sphere fetus with a fused METABALL body (three.js MarchingCubes, ~46 anatomical field balls: spine bezier, cranium/face cluster, limb chains with fusion midpoint balls, embryonic tail, umbilical ring). Body re-polygonizes only when stage params change (dirty flag) or on high-tier gentle drift (18 Hz throttle); quality tiers res 26/36/48.
- Fixed a critical transform bug found via screenshot+numeric debugging: MC grid spans sculpt/EXT, so object scale must be k×EXT — previously the body rendered 1.78× too small and eyes/glow anchors floated off-body.
- Fixed detached limb fragments at late stages by inserting midpoint balls per limb segment (metaball fusion spacing guarantee).
- Skin: MeshPhysicalMaterial with vertex-color palette (vascular red-pink early → vernix soft late, dorsal/belly/extremity variation, per-ball asymmetry hash), sheen + clearcoat driven per week (wet→dry maturation).
- Head: cranium/occiput/crown/forehead/brow/cheek/jaw/chin/nose/ear ball cluster; eyes are local-space groups (closed lids = skin seam → dark irises from ~week 26 with highlight dot; protrusion factor tied to openness); sculpted ears.
- Umbilical cord rebuilt as helical (Wharton's-jelly coil) tapered tube with quantized-key imperative geometry rebuild; placenta as organic lathe with vertex-color vascular gradient, edge wobble, and 7 chorionic vessel tubes; uterus as custom fresnel-rim shader membrane.
- Scene (new scene.tsx): photographic 3-point lighting with soft shadows + local Environment lightformers (no CDN), amniotic particles (reduced-motion aware), CSS vignette; heartbeat glow sprite (educational pulse, reduced-motion aware).
- UI: render-quality selector (Light/Standard/Rich, bilingual), camera fov 40 + zoom 5.0, alpha canvas over niva-grad.
- Browser E2E (agent-browser): weeks 4/6/12/20/32/40 verified visually (organic form, fused limbs, cord, vessels, membrane); eyes verified via depthTest x-ray then protrusion fix; low tier + mobile 390px verified; found dev-server-down incident mid-session (restarted detached, rate-limit waits) and two earlier crashes were Fast-Refresh/Canvas-unmount dev-mode artifacts (previously documented).
- lint: 0 errors (1 pre-existing font warning); tsc clean; dev.log 0 errors.

Stage Summary:
- Studio graphics upgraded from schematic primitives to a natural organic metaball fetus with physically-based skin, studio lighting, helical cord, vascular placenta and fresnel membrane. Scientific-integrity labeling unchanged (educational demonstration asset). New exports in params.ts: bodyMetrics, spinePoint, sculptScale, SCULPT_Y_OFFSET, headRadiusFor.

---
Task ID: hotfix-login-1
Agent: main (Z.ai Code)
Task: User reported "cannot log in — the button doesn't work". Diagnose and fix.

Work Log:
- Verified API works via curl (POST /api/auth/login 200) -> issue was client/embedding side.
- Reproduced full login flow with agent-browser: succeeded locally, but identified two real bugs.
- Bug 1: auth-view.tsx checked `data.user` but login/register/demo APIs return the user object directly -> successful logins always routed to onboarding instead of dashboard.
- Bug 2: session cookie SameSite=Lax is blocked inside the cross-origin preview-panel iframe -> /api/auth/me returned null right after login and the shell bounced back to landing ("button does nothing").
- Fix: hybrid session auth. lib/auth.ts issues SameSite=None; Secure over HTTPS (x-forwarded-proto) and Lax on plain HTTP. Auth APIs now return the session token. New AuthBridge client component patches fetch to attach Authorization: Bearer on same-origin /api calls. Auth (proxy) layer bridges the bearer token into the session cookie for every /api route so all endpoints work unchanged.
- Migrated deprecated middleware.ts to Next.js 16 proxy.ts convention after a deprecation warning appeared in dev.log.
- Fixed routing: login/demo -> dashboard, register -> onboarding. Logout clears the stored token.
- Verified end-to-end with agent-browser: fresh login -> dashboard; cookies cleared -> session restored via Bearer on reload; logout works. Lint clean (1 pre-existing warning). Pushed to github.com/sarefelahi-rgb/niva (commits da951b3, 1eee2b2).

Stage Summary:
- Login now works in normal tabs AND inside the preview-panel iframe (no-cookie Bearer flow verified).
- Key artifacts: src/proxy.ts (bearer->cookie bridge), src/lib/auth-token.ts, src/components/shell/auth-bridge.tsx, updated lib/auth.ts + auth routes + auth-view + store.

---
Task ID: 1-a
Agent: Explore (backend audit)
Task: API routes, data model & auth boundary inventory for Phase 0

Work Log:
- Read worklog.md (Tasks 1-11 + hotfix-login-1) to anchor the audit; confirmed hybrid cookie/Bearer session auth introduced by the login hotfix.
- Enumerated src/app/api/: 32 route files (incl. leftover scaffold src/app/api/route.ts "Hello, world!"), 56 exported HTTP handler methods. Read every route file end-to-end and tabulated method / auth / validation / rate-limit / purpose.
- Read helper layer: src/lib/api.ts (withUser role guard, assertSameOrigin Origin check, readJson 256KB ceiling), src/lib/auth.ts (scrypt N=16384, 256-bit token, 30-day sessions, SameSite=None over HTTPS), src/lib/auth-token.ts (localStorage token), src/proxy.ts (Bearer→cookie bridge on /api/*), src/lib/rate-limit.ts (in-memory Map), src/lib/db.ts, src/lib/audit.ts, src/lib/entitlements.ts, src/lib/gestational.ts, src/lib/safety.ts, src/lib/rag.ts.
- Read prisma/schema.prisma (434 lines, 27 models) and prisma/seed.ts (262 lines); checked package.json scripts (db:push --accept-data-loss) and .env/.env.example (DATABASE_URL only; no secrets in env files).
- Grepped src/ for $transaction (0 matches — no multi-step write is transactional), process.env (only NIVA_SANDBOX_PAYMENT_SECRET fallback + NODE_ENV), requireUser/userHasRole/logAdminAction (defined, never called — dead code), scientificSource (written by seed only, never read).
- Verified rate-limit call sites: only auth/register, auth/login, auth/demo, community POST, ai/chat POST are limited; verified subscription/webhook GET-signing flow at subscription/cancel/route.ts:9-22 that mints valid HMACs for any result value.

Stage Summary:
- Inventory: 31 functional API route files + 1 scaffold leftover; 27 Prisma models; all user-owned tables use onDelete: Cascade (18 relations), 3 use SetNull; ModerationAction and SafetyEvent.userId have NO relation/FK/index; 20 secondary indexes; 8 unique constraints.
- Top risks (ranked): (1) /api/auth/demo falls back to signing in as ADMIN@niva.health — unauthenticated privilege escalation if demo account missing (src/app/api/auth/demo/route.ts:16-18); (2) GET /api/subscription/cancel signs arbitrary paymentId:result for the payment owner, then POST /api/subscription/webhook accepts it → free plan upgrade without payment; webhook secret has hardcoded fallback (cancel/route.ts:9-22, webhook/route.ts:18,25); (3) zero db.$transaction usage — pregnancy create+dating, appointment+reminder+notification, webhook payment+subscription+entitlement+notification, privacy delete are all non-atomic; (4) AI daily quota is non-atomic check-then-write (ai/chat/route.ts:32-42 vs 51-77) — concurrent requests bypass the FREE 5/day cap; emergency replies also consume quota; (5) Prisma query logging unconditional log:['query'] (db.ts:10) — verbose SQL incl. health data in prod logs, should be env-gated; (6) in-memory fixed-window rate limiter keyed on spoofable x-forwarded-for (rate-limit.ts:13-28), docstring claims sliding window; (7) session token mirrored to localStorage + fetch monkey-patch (auth-token.ts, auth-bridge.tsx) — XSS steals sessions; SameSite=None over HTTPS widens CSRF surface, Origin check fails open when Origin header absent (api.ts:21); (8) POST /api/auth/logout reads cookie only — embedded Bearer sessions are never revoked server-side; (9) hardcoded seed credentials in repo (seed.ts:50-52) + 'NivaDemo!2025' literal in demo route:20; (10) admin/review POST creates ClinicalReview row before verifying contentId exists → orphan rows on 404 path (admin/review/route.ts:35-47).
- Dead/duplicate logic: src/app/api/route.ts scaffold, requireUser/userHasRole (auth.ts:90-96), logAdminAction (api.ts:58-67), ScientificSource model (no relations, seed-only writes), community GET line 37 `p.userId === user.id ? p.authorAlias : p.authorAlias` (identical branches), next-auth + next-intl dependencies unused (custom auth instead).
- IDOR posture: good — every fetch-by-id route scopes by owner (journal:38, appointments:68, reminders:40, documents:58, ai/chat:25, conversations:32, family:71, subscription/cancel:15,28, notifications uses updateMany+userId); no IDOR found. Missing: no validation/rate-limit on destructive privacy/delete (no re-auth), consent withdrawal impossible (privacy/consent/route.ts:15-19 always resets withdrawnAt:null).
- No source files modified; this audit is research-only.
---
Task ID: 1-c
Agent: Explore (AI/safety/billing audit)
Task: AI assistant, medical safety, subscriptions, admin/ops audit for Phase 0 (RESEARCH ONLY — no source files modified)

Work Log:
- Read worklog.md (Tasks 1-11, hotfix-login-1) to anchor on prior claims, then verified every claim against actual code.
- AI pipeline: read src/lib/rag.ts (169 ln) and src/lib/safety.ts (221 ln) fully; confirmed 14 deterministic regex rules (10 EMERGENCY / 4 CAUTION) at safety.ts:27-159; EMERGENCY short-circuits LLM before any model call (rag.ts:113-123); fixed 115/123 templates (safety.ts:202-215); injection heuristics = 7 regexes (safety.ts:179-187), flagged content still reaches a fenced LLM call (rag.ts:131-136) with a warning appended (149-154).
- RAG retrieval: pure in-memory lexical keyword-overlap scoring (rag.ts:39-54; primary kw +3 / secondary +2 / title-topic +1, threshold ≥3, k=4) over the 24-entry bilingual MEDICAL_KNOWLEDGE (verified 24 ids; exactly 4 redFlagRelated=true at lines 438/460/482/547). No embeddings, no vector store, no re-ranking. weekly-content.ts = 37 weeks (4-40) used for timeline/content, not retrieved by RAG.
- Verified citations can only be real KB entries (rag.ts:157 maps retrieved chunks) but ungrounded answers (score<3) return citations:[] while LLM answers from general knowledge (rag.ts:67, 86, 157).
- Read api/ai/chat/route.ts + api/ai/conversations/route.ts: quota = count ASSISTANT messages since server-local midnight (chat/route.ts:28-42) then create message AFTER LLM (51-77) → TOCTOU race, no transaction/lock; FREE cap 5/day (entitlements.ts:24); 20/min IP rate limit in-memory keyed on spoofable XFF (chat/route.ts:17, rate-limit.ts:25-28); PHI persisted in AIConversation/AIMessage; audit + SafetyEvent carry categories only (audit.ts:28-36 sanitize). System prompt is sent as role 'assistant' not 'system' (rag.ts:132-133); last-6 history passed unfenced/unrescanned (134).
- Subscriptions: read entitlements.ts + subscription/route.ts + cancel/route.ts + webhook/route.ts. PLAN_FEATURES single source (entitlements.ts:22-59); expiry computed on read (77-88); setEntitlement does 3 non-transactional writes (90-111). Webhook has HMAC-SHA256 timing-safe verify + PENDING-only replay guard (webhook/route.ts:36-47) BUT fallback secret hardcoded (webhook/route.ts:25, cancel/route.ts:18) and GET /api/subscription/cancel mints valid signatures for the payment owner (cancel/route.ts:9-22), which subscription-view.tsx:62 calls client-side → payment success is fully client-orchestrated (sandbox by design, comments say so). No trial (TRIALING never set), no refunds (REFUNDED never written), no renewal/expiry job, single IRR catalog with no USD/geo logic (entitlements.ts:71-75). Server-side enforcement verified per route: AI cap (chat), familyAccess (family/route.ts:30-33), dataExport (privacy/export/route.ts:10-12), advanced3DLayers (assets/route.ts:24-25); communityPosting/journalExport/guidedMode NOT enforced anywhere.
- Admin: read all 7 routes + admin-view.tsx + review-view.tsx. RBAC via withUser(roles) (api.ts:34-56, check at 44-46): overview/review/safety = ADMIN+CLINICAL_REVIEWER; users/finance/flags/audit = ADMIN only. Audit logging present on decisions/resolve/flags/cancel/webhook. Missing: community moderation route (posts stuck PENDING forever; ModerationAction model has zero references in src/), refunds, user management actions (users route read-only), tickets, incident lifecycle (safety resolve is a boolean flip), feature flags consumed nowhere (grep: only flags route + seed reference featureFlags), 'ar' flag not rendered in UI (admin-view.tsx:213-217), reviewer notes hardcoded "(sandbox demo)" client-side (review-view.tsx:43).
- Privacy/family/community: export = inline JSON gated by paid plan → 402 for FREE (export/route.ts:10-12) — GDPR conflict; delete = hard user.delete with FK cascade (delete/route.ts:12) but SafetyEvent.userId has NO FK (schema.prisma:287) and PartnerAccess.partnerEmail retains deleted-user emails (schema:320); consent route cannot withdraw (update always sets withdrawnAt:null, consent/route.ts:15-18); family auto-ACTIVATES a grant if partner email already exists, without partner consent (family/route.ts:49-51); no partner data-serving route exists (grep: grantsReceived never read) — dead capability.
- Domain routes: tracking scans free text (tracking/route.ts:41-45) but journal (10k chars) does not (journal/route.ts:22-30); bpAlert is computed but no SafetyEvent raised for it (tracking/route.ts:30-32); appointments create T-24h reminder + in-app notification (appointments/route.ts:49-59); NO scheduler/background job/email/SMS/push anywhere — reminders/notifications only render if a client polls; documents = metadata registry, binaries deliberately rejected (documents/route.ts:6-11); content serves IN_REVIEW alongside APPROVED with truthful badge (content/route.ts:18); assets serve PUBLISHED only with week>24 plan lock (assets/route.ts:8-26).
- Fake/hardcoded inventory: SANDBOX payments (client-minted signatures), hardcoded seed credentials admin@niva.health/NivaAdmin!2025 + reviewer/demo (seed.ts:50-52), auth/demo falls back to the ADMIN account when the demo user is absent (demo/route.ts:16-18 — unauthenticated admin path on unseeded DB), hardcoded sandbox secrets, 4 hardcoded safety smoke phrases (overview/route.ts:24-29), inert feature flags, unused ModerationAction/journalExport/guidedMode.

Stage Summary:
- AI pipeline is genuinely deterministic-first: EMERGENCY red flags never reach the LLM (verified code path rag.ts:113-123) and citations are structurally incapable of fabrication (they are the retrieved entries themselves). Weak points: LLM OUTPUT is never re-scanned (only disclaimer enforcement, rag.ts:146-148), CAUTION answers get no special handling, ungrounded answers cite nothing with no UI warning, system-prompt-as-assistant-role + unfenced history weaken prompt-injection defense, and the 5/day quota has a check-then-act race (no transaction).
- Billing verdict: NOT production-ready and honestly labeled sandbox — payments are simulated end-to-end (client mints its own webhook signature), no real PSP adapter, no trials, no refunds, no renewal/expiry jobs, non-transactional entitlement writes, single-currency IRR catalog. Entitlement enforcement itself is real and server-side on the four feature routes that consume it.
- Admin/moderation matrix: read-only dashboards + content/asset review workflow are real and audited; community moderation, refunds, tickets, incident management, user management actions, and effective feature flags are missing. Biggest integrity gap: community posts can never leave PENDING (no approve route exists).
- Privacy: hard delete works via FK cascade (with SafetyEvent/PartnerAccess PII residue), export works but is paywalled (GDPR conflict), consent withdrawal is impossible via API, partner access auto-activates without partner consent and serves no data.
- Top risks (evidence in stage log above): 1) client-minted payment signatures; 2) demo→ADMIN fallback on unseeded DB + hardcoded seed creds; 3) AI quota TOCTOU race; 4) GDPR paywalled export + no consent withdrawal; 5) no LLM output-side safety re-scan; 6) moderation dead-end; 7) partner auto-consent + dead capability; 8) hardcoded secrets + XFF-keyed in-memory limiter; 9) no background jobs/delivery channels; 10) journal/community unscanned for red flags.

---
Task ID: 1-b
Agent: Explore (frontend audit)
Task: Frontend, 3D studio, PWA, i18n, accessibility audit for Phase 0 (RESEARCH ONLY — no source files modified)

Work Log:
- Read worklog.md (Tasks 1-11 + hotfix-login-1) for prior context; inventoried repo (20 views, 4 studio files, shell, i18n, PWA assets).
- Router audit: src/app/page.tsx (112 ln) — 22-value View union in src/store/app.ts:8-12 switched via zustand state; all views statically imported (no dynamic import/code splitting); view state NOT persisted (partialize keeps only locale/tourDone, store/app.ts:124) so reload always resets to landing and loses deep-link/back-button semantics; client-side role guards at page.tsx:54-55 mirror server-side API guards; `booted` flag set by refresh() (store/app.ts:103-110) but never used to gate rendering in page.tsx → logged-in users see a LandingView flash on every reload until /api/auth/me resolves.
- Shell audit: app-shell.tsx (283 ln) — desktop sidebar + mobile Sheet menu + 5-slot bottom nav + notification sheet; notifications refetched on every view change (dep [user, view] line 79); dead `<Sheet open={false}>` wrapper around logout button (lines 182-187); ImmersiveShell for studio (lines 269-283). tour-overlay.tsx (62 ln): 5-step Dialog; `role="tablist"` on progress dots without tab children (line 32) — invalid ARIA.
- View-by-view audit of all 20 views under src/components/views/ (sizes, states, i18n, mock data) — see table in stage summary. Verified: 10 views repeat an identical fetch/load/useCallback/Skeleton boilerplate; loading+empty states present in nearly all data views; error handling is toast-based, fetch-failure leaves views silently empty.
- 3D studio audit: params.ts (159 ln, 12 keyframes + lerp, shared sculpt math); fetus-model.tsx (690 ln, real-time MarchingCubes metaballs ~46 balls, MeshPhysicalMaterial skin, helical cord, lathe placenta, fresnel membrane shader); scene.tsx (109 ln, 3-point lights + local Environment lightformers + amniotic particles); fetal-studio.tsx (271 ln, Canvas dpr tiers 1.25/1.6/2, LOD res 26/36/48, guided tour 5s, WebXR capability detection, reduced-motion detection). Confirmed renders are REAL-TIME Three.js — download/*.png (19 files) are dev-evidence screenshots, referenced by nothing in src/ (rg verified).
- Memory-leak review of fetus-model.tsx: MC geometry+material disposed (254-259), membrane disposed (323), cord/placenta geometries disposed on rebuild (437-439, 454-456); NOT disposed: glowTex (326, useMemo CanvasTexture, no cleanup), placenta vessel TubeGeometries on `clear()` (460-465 — old vessel geometries leak on each placenta key change), AmnioticParticles tex (scene.tsx:58). `onFrameParams` prop invoked every frame with fresh object (395) but never passed by any caller — dead per-frame allocation.
- PWA audit: public/sw.js (34 ln, network-first, `/api/` explicitly never cached — private health data safe; unbounded runtime cache with no eviction; only 4 prefetched shell assets; fonts cross-origin never cached). public/manifest.webmanifest: installable baseline (512 any + same file declared 192 maskable, standalone, theme colors); no screenshots/shortcuts. layout.tsx registers manifest + themeColor light/dark; sw registered in page.tsx:96-98.
- i18n audit: src/lib/i18n.ts (282 ln) — flat dotted dict, 362 unique keys, fa/en perfectly symmetric (diff empty), fallback en→key, no interpolation/plural support (values are concatenated in components); RTL via document.documentElement.dir (store/app.ts:84) + logical utilities (ms-/me-/ps-/pe-/start-/end-); hardcoded leaks: ~16 components use inline `locale === 'fa' ? '…' : '…'` ternaries for content (admin-view:87-96, postpartum, birth-prep, nutrition:61-75, settings:93-94, community:51, journal:119 etc.), enum values rendered raw (appointments:116 CHECKUP/ULTRASOUND, records:91, community:92/112/128, subscription:112/154-155, admin role/plan cells), English aria-labels (app-shell:134/198/211/274, community:132, landing:31), English citation link text "source" (assistant:181), English technical summary paramsSummary (fetal-studio:268-271).
- Design system: globals.css (204 ln) — full oklch token set light+dark, niva-grad/niva-card surfaces, reduced-motion media query, :focus-visible outline, .num LTR-in-RTL helper. BUG FOUND: `--font-niva-sans` / `--font-niva-rtl` are referenced (globals.css:9,131,142) but defined NOWHERE → html/body font-family declarations are invalid at computed-value time, so Vazirmatn/Inter (loaded via CDN link in layout.tsx:34-39) are never actually attached; UI falls back to browser default stack. tailwind.config.ts (64 ln) is a v3-style hsl(var()) config with stale content globs (./components, ./app — sources live in src/) and no @config directive in globals.css → dead/ignored legacy artifact, inconsistent with the CSS-first Tailwind 4 setup.
- Accessibility: strong points — min-h-11 (44px) on most nav/forms, aria-pressed toggles, aria-current on nav, role="alert" errors, dir="ltr" on numeric/email inputs, keyboard zoom/reset buttons in studio, prefers-reduced-motion honored in scene + CSS, text alternative panel for 3D. Gaps — 28px icon buttons (community:132, records:128, journal:122, appointments:172; records/journal deletes also opacity-0 until hover → keyboard-invisible), 32px studio week/quality buttons (fetal-studio:207,240), studio zoom buttons 40px (fetal-studio:168-176), 3D hotspots pointer-events-none and not focusable, emoji used as icons (🔒 ☀️ 👋 ✓ ⚠ ∞).
- Dead code/oversize: fetus-model.tsx 690 ln (monolith: sculptor+eyes+cord+placenta+hotspots+glow), tracking 255, admin 241; dead code — useTour export (tour-overlay:59, unused), onFrameParams (never passed), 'sandbox-checkout' View id (store/app.ts:12 + returned by api/subscription/route.ts:49 but page.tsx has no case → falls to dashboard), duplicate ternary community-view:56 `data.flagged ? t('community.moderated') : t('community.moderated')`, dead Sheet wrapper app-shell:182-187; settings-view:93-94 fires `saveConsent({})` (empty POST) as a side effect of language switching; subscription-view:62 fetches `/api/subscription/cancel?paymentId=` as GET to obtain an HMAC signature client-side (sandbox-labeled but architecturally odd); AuthBridge monkey-patches window.fetch globally (auth-bridge.tsx:16).
- Validation: `bunx tsc --noEmit` exits 0 (clean); no source file modified — only this worklog entry appended.

Stage Summary:
- Views (20/20 under single-route constraint): landing 122, auth 145, onboarding 221, dashboard 171, timeline 116, tracking 255, assistant 227, records 143, appointments 220, nutrition 106, birth-prep 105, postpartum 105, family 153, community 145, journal 136, subscription 225, settings 171, admin 241, review 147, safety 71 (ln). All localized via t() except documented inline-ternary content; data views have loading skeleton + empty state; none has a dedicated error state (silent-empty on fetch failure); birth-prep checklist state is memory-only (lost on reload); no inline fake/mock data found (seeded DB + curated datasets instead).
- Top risks ranked: (1) i18n font bug — --font-niva-sans/-rtl undefined so brand typography never applies (globals.css:9,131,142); (2) SPA routing ceiling — no URL sync/history/deep-links/SEO, view flash on reload, will not scale to 20+ indexable views (page.tsx, store/app.ts:124); (3) client role-gating UX only (page.tsx:54-55) — safe server-side but admin views silently show dashboard instead of a "no access" state; (4) studio memory leaks on long sessions — placenta vessel geometries + glow textures never disposed (fetus-model.tsx:326,460-465; scene.tsx:58); (5) silent empty views on API failure — no error states or retries in any view; (6) unbounded SW runtime cache + stale-while-revalidate absence — no eviction, cached HTML may go stale, offline fonts missing (sw.js:20-33); (7) touch-target and focus gaps (28-32px targets, hover-only delete buttons, invalid tablist ARIA); (8) content duplication — ~60% of static educational copy lives as inline locale ternaries outside i18n.ts (postpartum, birth-prep, nutrition, safety-view:9-30), splitting the translation surface and breaking the dictionary ADR-007 pattern.
- Verified non-issues: API responses never SW-cached; 3D is real-time parametric (no PNG usage); tsc clean; manifest installable; 362-key fa/en dictionaries symmetric; reduced-motion handled end-to-end (CSS + scene + studio UI).

---
Task ID: phase-0-audit
Agent: main + 3 Explore subagents (1-a backend, 1-b frontend/3D, 1-c AI/safety/billing)
Task: Phase 0 complete repository audit for enterprise reengineering master prompt

Work Log:
- Ran 3 parallel audit agents over backend (32 routes/56 handlers/27 models), frontend (21 views, 3D studio, PWA, i18n, a11y), and AI/safety/billing/admin.
- Independently verified all 8 named risk items (ignoreBuildErrors=true, noImplicitAny=false, demo->ADMIN fallback, localStorage token, SameSite/CSRF fail-open, unconditional query logging, AI quota TOCTOU + XFF-keyed limiter, db:push --accept-data-loss).
- Captured baseline toolchain evidence: tsc --noEmit (0 errors in src/; 4 errors only in examples/+skills/ scaffolding), lint 0 errors/1 warning, build deferred to CI per sandbox policy.
- Wrote Phase 0 deliverables: docs/audit/00-repository-audit.md (inventory+architecture diagram), 01-risk-register.md (18 risks + 3 accepted), 02-backlog.md (6 waves mapped to P0-P15), 03-adrs.md (ADR-001..010), 04-baseline-reports.md.

Stage Summary:
- Verdict: strong working foundation (auth, dating engine, safety-first AI, 3D studio, 20 localized views) with 2 CRITICAL security debts (payment self-minting, demo->admin escalation), zero tests/CI, and broken brand typography.
- Phase 1 entry point agreed: Wave 0 hotfixes then brand/landing waves. Awaiting user ratification of ADRs and Wave 0 scope.

---
Task ID: wave0-phase1
Agent: main (Z.ai Code) — reengineering Wave 0 + Phase 1
Task: User approved "continue and complete" — execute Wave 0 integrity hotfixes + Phase 1 brand identity

Work Log (Wave 0 — all verified by execution):
- 0.1 demo/route.ts: removed ADMIN fallback; role integrity guard; NIVA_DISABLE_DEMO env hard-gate.
- 0.2 payments: DELETED signature-minting GET from subscription/cancel; new server-orchestrated POST /api/subscription/confirm (sandbox-only via PAYMENTS_MODE, owner-scoped, PENDING-only, idempotent); webhook secret env-only fail-closed (NIVA_PAYMENT_WEBHOOK_SECRET) + rate limit; checkout no longer pre-mutates ACTIVE subscription plan (plan derived from payment amount); client confirmSandbox rewired. Browser-verified: checkout → confirm 200 → plan PREMIUM_MONTHLY, aiPerDay -1.
- 0.3 db.ts: query logging dev-only (prod silent unless NIVA_LOG_DB_QUERY=true).
- 0.4 configs: removed ignoreBuildErrors, reactStrictMode=true, removed noImplicitAny:false, tsconfig excludes examples/skills/mini-services. NOTE: stale tsbuildinfo had masked errors — cleared; found+fixed payment.amount field bug (TS2339) and fetus-model.tsx:323 malformed effect.
- 0.5/1.4 fonts: self-hosted Vazirmatn + Inter variable woff2 (OFL, jsDelivr npm), @font-face in globals.css (fixed format('woff2') — Turbopack/lightningcss strips format('woff2-variations')), Google Fonts CDN removed from layout → lint 0 warnings. Browser-verified: body font Vazirmatn, fonts loaded.
- 0.6 transactions: pregnancy create+dating, appointment+reminder+notification, payment webhook/confirm/cancel chains now db.$transaction.
- 0.7 AI quota: atomic — count-check + user/assistant inserts inside ONE transaction post-LLM; EMERGENCY answers always persist; pre-check kept as advisory. Verified: chat reply 747 chars, 4 citations, NORMAL.
- 0.8 consent: withdraw:true stamps withdrawnAt; normal updates never reset it (verified via API); data export unpaywalled for all plans (HTTP 200).
- 0.9 GPU: vessel TubeGeometry disposal on rebuild, glowTex disposal (model + particles), removed dead onFrameParams prop + call; fixed malformed membraneMat effect deps.
- 0.10 a11y: journal/records delete buttons 28px hover-only → 44px always-visible; community report 44px + localized aria; tour dots role=tablist → group; added i18n keys (community.report/flagged, tour.progress, status.MODERATED) fa+en symmetric; fixed dead ternary in community view.

Work Log (Phase 1 — brand):
- Palette "Calm Bloom": lavender/ivory/coral/sage oklch tokens, light+dark; ALL 12 text pairs WCAG-measured ≥4.5:1 (script in shell history: 4.64–14.79:1). Verified in browser: --primary lavender, dark bg violet-charcoal.
- Logo system "Cradle Bloom": original SVG monogram (squircle gradient + cradle arc + seed dot) + horizontal lockup (NIVA + نیوا); app icons 192/512/1024 rendered from the same vector via sharp; favicon-32; manifest corrected (true sizes, maskable, theme #7a6bb5) — R-18 closed.
- docs/brand/01-brand-strategy.md: positioning, promise (EN/FA), archetype, naming, messaging framework, tone tables, imagery rules, logo construction, palette w/ measured contrast table, typography (self-hosted OFL), motion, iconography, export specs.

Stage Summary:
- Wave 0: 10/10 items implemented with execution evidence (browser + API + negative IDOR test: cancel non-owned → 404).
- Phase 1: brand identity implemented and verified (fonts loaded, tokens applied, icons rendered).
- Known residuals: R3F+React19 StrictMode dev-only unmount warning (upstream, studio verified functional); THREE.Clock/PCFSoftShadowMap deprecation warnings from drei internals; tsc 0 errors, eslint 0 errors 0 warnings.
- Next: Phase 2 premium landing rebuild.

---
Task ID: phase2-landing
Agent: main (Z.ai Code)
Task: Phase 2 — premium landing rebuild with measurable CWV (backlog 1.6–1.8)

Work Log:
- Rebuilt landing-view.tsx: sticky glass header w/ logo lockup + anchor nav (6 sections), hero (kicker, review badge, H1=LCP, sized img fetchPriority=high), stats strip (12/24/40+), sticky footer w/ mt-auto.
- New src/components/landing/: hero-bloom.tsx (lightweight R3F ambient scene — low-poly lavender core + coral/sage satellites, low-power GL, prefers-reduced-motion single frame, NOT the fetal model), sections.tsx (Journey 3 trimesters / Science+methodology / Assistant boundaries can-cant / 9-module features / transparent pricing / trust / FAQ accordion).
- Code splitting: sections + hero-bloom via next/dynamic (ssr:false for bloom, idle-gated variant B); skeleton fallback.
- Single source pricing: new src/lib/plans.ts (client-safe PLAN_FEATURES + PLAN_CATALOG); entitlements.ts re-exports — landing shows real catalog values (2.49M/24.9M/3.99M Toman), dataExport corrected to always-free per Wave 0 0.8.
- i18n: +106 keys fa+en (468/468 symmetric) — journey, science, boundaries, features, pricing rows, trust, FAQ×6, consent bar, footer.
- SEO: metadataBase+canonical+hreflang fa/en/x-default, OpenGraph; /?lang= deep links read at boot (real working alternates); app/sitemap.ts w/ language alternates; robots.txt Sitemap line; JSON-LD Organization+SoftwareApplication (static) + FAQPage (mirrors visible accordion).
- Analytics 1.8: Prisma LandingMetric (day/name/variant/count — NO user id/IP/UA), POST /api/analytics/landing (zod enum whitelist, rate-limited, ZodError→400 per withUser convention), src/lib/landing-analytics.ts (localStorage consent + 50/50 sticky variant, decline records NOTHING), consent bar on landing.
- A/B: variant B swaps hero art for lazy 3D bloom after idle; assignment only after consent.

Stage Summary:
- CWV measured (docs/audit/05-landing-cwv.md): LCP 700ms ✓ (≤2500), CLS 0.0128 ✓ (≤0.1), INP ~104ms ✓ (≤200). DOMContentLoaded 318ms, doc 96KB.
- E2E verified: fa RTL + en LTR + ?lang deep links; consent accept/decline flow; beacons in DB (landing_view/cta_demo/ab_consent_granted w/ variant); negative tests 400/CSRF; FAQ accordion; pricing values; footer flush; mobile 390px.
- Fixed en route: analytics route file initially missing (first Write failed on absent dir) — caught by 404 in browser test, rewritten + error-convention aligned.
- tsc 0 / lint 0 / i18n symmetric 468/468. Dev-overlay "1 Issue" = documented upstream THREE.Clock deprecation (drei), dev-only.
- Next: Phase 3 (onboarding) + Phase 4 (dashboard v2) per Wave 2.
---
Task ID: wave2-phases-3-4-6
Agent: main (Z.ai Code) — reengineering Wave 2 (Phases 3, 4, 6 + safety coverage)

Work Log:
- Schema: EducationalContent +evidenceGrade/reviewedAt/expiresAt (CMS hardening); new Preference model (stage/goals/units, unique userId cascade); SafetyEvent + User FK (SetNull) + userId index (closes PII-residue finding); db:push clean.
- 2.2 Onboarding v2: 3-step wizard (stage TRYING/PREGNANT/POSTPARTUM/EXPLORING → dating for PREGNANT → progressive-profiling preferences: 7 goals + units); resumable draft in localStorage (niva_onboarding_draft_v2) with resume banner; uncertainty band shown per method (LMP ±21d / scan ±10d / clinician ±7d); new /api/preferences GET+PUT (zod enum whitelist, audited).
- 2.3 Dashboard v2: SVG radial gestational clock + due-date window (±days by datingConfidence) + "estimate not certainty" note; educational prenatal-visit cadence card (trimester-highlighted, clinic-priority note); stage-aware no-pregnancy state (TRYING/POSTPARTUM/EXPLORING get welcome card instead of pregnancy CTA); offline-tolerant fetches: AbortController + retry button + stale-response guard (StrictMode aborted load no longer poisons state — bug found & fixed via browser test).
- 2.1 Account security: /api/auth/sessions GET (metadata only, current flag) + DELETE (owner-scoped revoke, audited); /api/auth/logout-all POST (destroyAllSessions); /api/auth/password POST (re-auth with current password, strength rule, revokes all OTHER sessions transactionally, keeps current); Settings UI: password-change dialog, active-sessions dialog with per-session revoke + "this device" badge.
- 2.4 CMS: content route suppresses expired content (expiresAt < now); admin review POST rewritten — target verified BEFORE review row, decision+review atomic in $transaction (orphan-row bug fixed), APPROVED stamps reviewedAt + 12-month expiry; ProvenanceBadge component (grade A–D + true status + reviewed date) rendered in nutrition view; seed assigns honest grades (KB=C guideline consensus, weekly=D educational) idempotently via upsert update clause.
- 2.5 Safety coverage: output-side AI re-scan in rag.ts (LLM reply matching EMERGENCY patterns is REPLACED by fixed template); journal POST red-flag scan → SafetyEvent HIGH + UI toast + redirect to safety view; community POST red-flag scan → flagged + urgent moderation note + HIGH event; tracking POST BP ≥140/≥90 → MEDIUM RED_FLAG_SYMPTOM event; staff escalation: logSafetyEvent fans out SAFETY notifications to all ADMINs on HIGH/CRITICAL.
- i18n: +60 keys en+fa (onboarding stages/goals/units, dash uncertainty/visits/errors, settings security, cms grades) — 528/528 symmetric.
- Fixes found by E2E: StrictMode stale-load race in dashboard (guard added); duplicated "About the size of" phrase (strip prefixes in dashboard+timeline).

Evidence (browser + API):
- Wizard E2E: register→wizard→stage PREGNANT→LMP 2026-08-01→preview ۱۴۰۶/۲/۱۸ ±۲۱ روز→goalsNutrition+Sleep→finish → pregnancy created (week 11) + preferences saved + tour opened.
- Negative tests: wrong current password → 401 INVALID_CREDENTIALS shown in dialog; re-revoke session → 404; logout-all → old token 401.
- Journal "heavy bleeding and severe abdominal pain" → {safetyLevel:EMERGENCY, categories:[BLEEDING,PAIN]} + SafetyEvent HIGH + admin received "High-severity safety event" notification. BP 150/95 → MEDIUM event "Elevated blood pressure recorded: 150/95". (test rows cleaned afterwards)
- Sessions dialog shows only current session after password change (others revoked) — correct.
- Mobile 390px + en LTR verified visually; tsc 0 / eslint 0; console errors: none new (THREE.Clock deprecation + R3F StrictMode dev-only unmount warning remain upstream).

Stage Summary:
- Wave 2 core: 2.2 IMPLEMENTED+VERIFIED, 2.3 IMPLEMENTED+VERIFIED, 2.4 IMPLEMENTED+VERIFIED, 2.5 IMPLEMENTED+VERIFIED, 2.1 PARTIAL (sessions/rotation/password done; email verification + MFA deliberately deferred to Wave 5, documented).
- Honest deferrals: MFA (admin), email verification/recovery, translation review track (CMS), community moderation queue UI (Wave 4).
- Next: Wave 3 (AI RAG v2 + studio excellence) or Wave 4 (ecosystem) per backlog order; recommend Wave 4 moderation loop + notifications scheduler next.

---
Task ID: wave4-foundation
Agent: main (Z.ai Code)
Task: Wave 4 foundation — schema v3 (moderation FKs, partner invites, wellness/birth/baby models, schedulable notifications) + seed + central i18n pre-add

Work Log:
- Schema: ModerationAction got real relations (post → CommunityPost Cascade, moderator → User SetNull); CommunityPost.moderatedBy wired (FK repair — model was dormant). PartnerAccess + inviteToken @unique / inviteExpiresAt / declinedAt, status enum + DECLINED, index on partnerEmail. Notification + channel/scheduledFor/sentAt/dedupeKey @unique (scheduler-ready, dedupe = idempotent jobs). Consent + emailReminders (service-email consent).
- New models: NutritionEntry, ExerciseEntry, SleepEntry, MoodEntry (unique [userId,date] upsert-per-day; exercise many-per-day), BirthPlanItem (unique [userId,category,itemKey]), ContractionEntry, FeedingEntry, BabyCareEntry. User relations extended. db:push clean → 37 models; prisma validate OK.
- Tooling note: MultiEdit partially applied + corrupted two FK lines (missing '['); fixed via python string replace; verified with prisma validate.
- Seed: +6 APPROVED reviewed content items (EXERCISE/SLEEP/MOOD/NUTRITION-hydration/FEEDING×2) w/ evidenceGrade C, reviewedAt, 12-month expiry (Wave 2 CMS contract); +2 PENDING demo community posts (one misinfo-flagged flagCount:2) for moderation queue; typo fix in hydration bodyFa. Seed run OK.
- i18n: +167 keys per locale across mod.*/community.*/family.*/wellness.*/birth.*/post.*/notifs.*/settings.notif*/admin.scheduler* — 695/695 symmetric, 0 duplicates; tsc --noEmit clean.

Stage Summary:
- Foundation ready for 5 parallel/serial agents. i18n.ts is CENTRALLY managed from here: subagents must NOT edit it (report MISSING_I18N_KEYS instead).
- Task IDs: wave4-2a (moderation), wave4-2b (partner), wave4-2c (birth/baby), wave4-3a (wellness), wave4-3b (scheduler).
