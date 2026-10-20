# NIVA — Postgres Migration Rehearsal Plan (Wave 5.2, NON-DESTRUCTIVE)

Status: PLAN READY — **not executed**. Per the platform guard ("no destructive
schema change without backup + rehearsal + rollback + explicit user approval"),
nothing in the sandbox build has been switched: the app still runs SQLite via
`db:push`. This document is the drill script for the production cutover.

Baseline artifact: `docs/audit/migration-rehearsal/0001-initial-sqlite.sql`
(698 lines — full DDL generated with `prisma migrate diff --from-empty` from
prisma/schema.prisma @ 2026-10-20, 27 models).

## 0. Why a rehearsal, not a flag flip

SQLite (sandbox) and Postgres (production target) differ in ways that break
naive swaps: no `createMany skipDuplicates` in SQLite (already worked around in
the scheduler), JSON stored as String columns (portable), datetime precision,
`String` enum guards, and index-name length limits. The rehearsal exercises all
of them on a copy before anyone touches production data.

## 1. Preconditions (checklist before the drill)

- [ ] Production Postgres instance available (staging parity: same major version).
- [ ] `DATABASE_URL` / `SHADOW_DATABASE_URL` secrets provisioned in the deploy env.
- [ ] A fresh backup of the source database taken and restore-tested
      (`sqlite3 db/custom.db ".backup backup-$(date +%F).db"` locally;
      `pg_dump -Fc` on any existing Postgres data).
- [ ] Downtime window agreed OR dual-write plan approved (see §5).
- [ ] Explicit user sign-off recorded in this file's changelog below.

## 2. Switch-over drill (rehearsal script)

1. **Freeze writes** — maintenance banner + disable mutating routes via env gate
   (`NIVA_READ_ONLY=true` wired into lib/api.ts at deployment time).
2. **Data export** — per-context dump through a migration script (users,
   pregnancies, appointments, content, AI conversations…). SQLite → CSV/JSON →
   `\copy` into Postgres. Row counts recorded per table.
3. **Schema migrate** — `prisma migrate deploy` with the Postgres provider
   (a `schema.postgres.prisma` variant; `provider = "postgresql"`). Shadow DB
   used for diff verification.
4. **Verify (gates, not vibes)**:
   - row-count parity per table (± 0);
   - referential spot checks (every AIMessage → existing conversation);
   - `scripts/verify-contracts.ts` against the migrated staging server → 19/19;
   - seed content renders (content feed, studio assets, knowledge base);
   - login + demo + admin paths return 2xx.
5. **Performance smoke** — p95 of /api/timeline, /api/content, /api/ai/chat
   retrieval within 20% of SQLite baseline (documented in baseline reports).
6. **Go / No-go** — any failed gate ⇒ rollback (§4). No partial cutovers.

## 3. Migrations replace db:push (post-cutover policy)

- `prisma migrate dev` becomes the only local/dev flow; `db:push` is removed
  from CI and docs. The initial migration is generated from
  `0001-initial-sqlite.sql` translated by `prisma migrate diff` against the
  Postgres schema (committed as `prisma/migrations/0001_init`).
- Every subsequent schema change ships a migration reviewed in the PR that
  changes schema.prisma; `migrate deploy` runs in the release pipeline before
  the new server accepts traffic.

## 4. Rollback drill

- Keep the source SQLite (or previous Postgres) dump immutable for 30 days.
- Rollback = reverse DNS/traffic switch + restore dump + re-run verification
  gates. Time-boxed to < 30 minutes in the rehearsal; measured and recorded.
- Any data written to the new system during the failed window is exported and
  reconciled manually (contact-level, logged in the drill report).

## 5. Dual-write alternative (if downtime is unacceptable)

Not recommended for first cutover (complexity ≫ benefit at NIVA's scale);
recorded for completeness: writes go to both stores behind a feature flag,
reads switch per-context after verification, flag removed after one full
menstrual-cycle-equivalent soak period.

## 6. Changelog

- 2026-10-20 — Plan created (Wave 5.2). **Not executed in sandbox** — awaiting
  production environment + explicit approval (platform guard).
