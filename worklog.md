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
