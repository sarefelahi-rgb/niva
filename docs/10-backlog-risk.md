# NIVA — Phased Backlog & Risk Register

| Field | Value |
| --- | --- |
| Document | 10-backlog-risk.md |
| Version | 1.0 (architecture baseline) |
| Task | 2-a |
| Related | 00-executive-summary.md §5, 01-system-architecture.md §10/ADRs, 07-security-privacy.md §14, 09-test-plan.md §9 |

Statuses: DONE / IN PROGRESS / PLANNED for the sandbox build phases; SPECIFIED,
DOCUMENTED-TARGET, DEFERRED for production intentions (vocabulary of
`01-system-architecture.md`). Statuses below reflect the state at the time this document was
written; `../worklog.md` is the live source of truth and supersedes this file on conflict.

## 1. Phased implementation backlog

### Phase 0 — Foundations
| Item | Status |
| --- | --- |
| Repository inspection, constraints capture (single route, SQLite, gateway) | DONE (Task 1) |
| Documentation suite 00–10 (this task) | IN PROGRESS (Task 2-a) |
| Datasets: knowledge base seed, red-flag patterns, proportion tables, dictionaries | PLANNED (parallel subagent) |

### Phase 1 — Schema & core libs
| Item | Status |
| --- | --- |
| Prisma schema implementing `02-data-model.md` (27 entities) | PLANNED |
| Seed data (bilingual content DRAFT/DEMONSTRATION, sources, assets registry) | PLANNED |
| Auth lib (scrypt, sessions, rotation, guards) | PLANNED |
| Rate limiter, zod validation helpers, audit helper, i18n dictionaries | PLANNED |
| Entitlement service + payment adapter interface (SANDBOX adapter) | PLANNED |

### Phase 2 — API layer
| Item | Status |
| --- | --- |
| Route handlers for all 16 groups of `03-api-spec.md` | PLANNED |
| Safety engine + RAG pipeline server-side | PLANNED |
| Payment webhook (HMAC, idempotent) | PLANNED |
| Privacy export/delete + consent endpoints | PLANNED |
| Admin review/moderation/metrics endpoints | PLANNED |

### Phase 3 — Design system & views
| Item | Status |
| --- | --- |
| Token set of `04-design-system.md` in globals.css (light/dark) | PLANNED |
| Client view router with 20 view ids + history sync | PLANNED |
| Onboarding tour | PLANNED |
| All 20 screens per §7 of the design doc | PLANNED |

### Phase 4 — 3D studio
| Item | Status |
| --- | --- |
| R3F scene graph + parametric generator + proportion tables | PLANNED |
| Layers, hotspots, guided mode, week scrub | PLANNED |
| LOD tiers + dpr adaptation + reduced-motion mode | PLANNED |
| WebXR capability detection | PLANNED |
| Asset registry integration + DEMONSTRATION labels | PLANNED |

### Phase 5 — AI assistant
| Item | Status |
| --- | --- |
| Knowledge base + retrieval + citations | PLANNED |
| Red-flag deterministic bypass + SafetyEvent | PLANNED |
| Prompt-injection heuristics + response validation | PLANNED |
| Conversation persistence + quota enforcement | PLANNED |

### Phase 6 — Social & commerce
| Item | Status |
| --- | --- |
| Family grants UI + enforcement | PLANNED |
| Community (invitation gate, alias, flagging, moderation queue) | PLANNED |
| Subscription UI + SANDBOX flow + entitlements | PLANNED |
| Notification center | PLANNED |

### Phase 7 — PWA & polish
| Item | Status |
| --- | --- |
| Manifest + service worker + install flow | PLANNED |
| Accessibility pass (WCAG 2.2 AA checklist of `09` §7) | PLANNED |
| Performance pass (budgets of `05` §7, `09` §5) | PLANNED |
| i18n completeness sweep | PLANNED |

### Phase 8 — Verification & handoff
| Item | Status |
| --- | --- |
| Golden paths G1–G10 executed in browser, evidence in worklog | PLANNED |
| Red-flag catalog manual execution (gate G-QA5) | PLANNED |
| Quality gates G-QA1..9 recorded | PLANNED |

### Phases 9+ — Production hardening (DOCUMENTED-TARGET)
| Item | Reference |
| --- | --- |
| PostgreSQL migration (ADR-001, `02` §11) | managed DB, migrations, PITR |
| Redis + BullMQ workers; distributed rate limits; email/SMS/push providers | `01` §10 |
| S3-compatible storage + malware scanning for documents | `07` §5 |
| RAG/model-gateway service extraction (ADR-005) | isolated secrets/scaling |
| Live Zarinpal/Stripe adapters + credentials vault + reconciliation | ADR-006 |
| MFA for privileged accounts; pen test; dependency scanning CI | `07` §14 |
| CI/CD + IaC + OpenTelemetry; staging environment | `01` §10 |
| React Native/Expo apps (or Capacitor) + store compliance | ADR-010 |
| App Router route migration from view ids | ADR-002 |
| Clinical reviewer recruitment + first real APPROVED content | `06` §9 |
| OpenAPI 3.1 publication + automated contract tests | `03` §6 |

## 2. Risk register (top 15)

Scale: likelihood and impact are Low/Medium/High. Owner roles: PO (product owner), LEAD
(lead engineer), CLIN (clinical lead), SEC (security lead), UX (design lead).

| # | Risk | L | I | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- |
| R1 | Clinical safety: user harmed by acting on content/AI output instead of care | M | H | Deterministic red-flag bypass (`06` §4); LLM hard constraints; referral-first language; escalation cards with 115/123; §4 catalog as release gate | CLIN |
| R2 | Regulatory: product deemed a medical device or health-privacy violation in a market | M | H | Non-device scope discipline (`06` §1); scoping questions for qualified counsel (`06` §12); no diagnosis/dosing anywhere; consent + export + delete shipped early | PO |
| R3 | Privacy breach of sensitive pregnancy data | M | H | Ownership-scoped queries; audit trail; encryption targets (`07` §8); minimal telemetry; breach runbook in hardening phase | SEC |
| R4 | 3D asset validity: proportions mislead users | M | M | Schematic labeling (ADR-009); source-linked proportion tables; review-gated changes (`05` §3, §12) | CLIN |
| R5 | Payment compliance: sandbox confusion or live-adapter mistakes | L | H | SANDBOX labeling everywhere; Entitlement server-side truth; idempotent HMAC webhooks; live adapters only after credentials + compliance review (ADR-006) | LEAD |
| R6 | AI hallucination despite grounding | M | H | Citation hard gate; empty-retrieval referral; response validation; sampled human review (`08` §5, §7) | LEAD |
| R7 | Data loss (SQLite file, no PITR) | M | H | Backup procedure + restore drill (`02` §15); early migration to managed Postgres in production plan | LEAD |
| R8 | Accessibility failures exclude users | M | M | WCAG 2.2 AA checklist; 44px targets; 3D text alternatives; a11y pass gate (`04` §9, `09` §7) | UX |
| R9 | Performance: 3D/AI degrade low-end devices | M | M | LOD tiers + dpr clamps; budgets as release blockers (`05` §7); fps monitor degrade path | LEAD |
| R10 | Misinformation spreads in community | M | M | Invitation gate; alias profiles; keyword flagging; moderation queue; no anonymous posting (`00` module Q) | PO |
| R11 | Dependency/vulnerability in supply chain | M | M | Pinned lockfile; server-only boundaries for SDK; scanning automation in hardening (`07` §12) | SEC |
| R12 | Single-node ops: outage or restart loses rate limits/cron state | H | M | Accepted in sandbox; Redis/queue migration planned; stateless app design keeps migration cheap (`07` §14) | LEAD |
| R13 | i18n quality: awkward Persian, broken RTL | M | M | Dictionary lint gate; RTL rules (`04` §6); Persian-first copy review; native-speaker review before launch | UX |
| R14 | Medical review capacity blocks content | H | M | Review queue tooling; batching; honest DEMONSTRATION labels meanwhile (`06` §7, §9); reviewer recruitment tracked as deferred module U item | PO |
| R15 | Scope creep beyond wellness boundary (features that drift into device territory) | M | H | Scope classification (`06` §1); written scope review before risky features; non-goals list (`00` §9) | PO |

## 3. Register maintenance

The register is reviewed at each phase boundary; likelihood/impact changes and new risks
append rows (never rewrite history silently). Any risk that materializes becomes an incident
note in the worklog with its evidence ids (`09-test-plan.md` §8).
