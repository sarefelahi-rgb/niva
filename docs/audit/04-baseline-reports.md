# NIVA — Baseline Reports (Phase 0, execution evidence)

All commands executed 2026-10-19 in /home/z/my-project. Raw outputs summarized; full logs in dev.log / terminal capture.

## 1. Typecheck — `bunx tsc --noEmit`

- **`src/` application code: 0 errors.**
- 4 errors exist OUTSIDE the app, in sandbox scaffolding (currently hidden from `next build` by `ignoreBuildErrors:true` — flagged R-12):
  - `examples/websocket/frontend.tsx(4,20)`: cannot find module 'socket.io-client' (not installed; example only)
  - `examples/websocket/server.ts(2,24)`: cannot find module 'socket.io'
  - `skills/image-edit/scripts/image-edit.ts(10,4)`: TS2561 property 'images'
  - `skills/stock-analysis-skill/src/analyzer.ts(253,11)`: TS2322 assignment
- **Action:** exclude `examples/` + `skills/` from tsconfig; remove `noImplicitAny:false` (Wave 0, item 0.4).

## 2. Lint — `bun run lint`

```
✖ 1 problem (0 errors, 1 warning)
warning: src/app/layout.tsx 36:9  no-page-custom-font (pre-existing)
```

## 3. Production build — `next build`

- **Not executed** — sandbox policy: dev server owns port 3000; `bun run build` is restricted in this environment. `output:"standalone"` config verified present. Build execution + artifact verification scheduled in CI (Phase 14, ADR-010).

## 4. Runtime smoke (browser automation, from hotfix-login-1 + today)

- Login flow (form → dashboard): PASS (cookies) and PASS with cookies removed (Bearer-only restore).
- Logout: PASS (server session deleted; token cleared).
- `/api/auth/me` via Bearer without cookie: 200 with user+plan+features: PASS.
- dev.log during tests: no runtime errors; all API calls 200.

## 5. Scale metrics

| Metric | Value |
| --- | --- |
| src ts/tsx files | 127 |
| src LOC | ~14,800 |
| Prisma models | 27 |
| API route files / handlers | 32 / 56 |
| Views | 21 (20 + studio shell) |
| i18n keys | 362 fa/en symmetric |
| Tests | 0 |
| CI pipelines | 0 |

## 6. Security spot-checks (manual, this session)

| Check | Result |
| --- | --- |
| `ignoreBuildErrors` | TRUE (next.config.ts) — flagged |
| `noImplicitAny` | FALSE (tsconfig) — flagged |
| `reactStrictMode` | false — flagged |
| Demo route admin fallback | CONFIRMED (`demo/route.ts:16-18`) |
| Query logging | `log:['query']` unconditional (`db.ts:10`) — flagged |
| Rate limiter | in-memory, fixed-window, XFF-keyed — confirmed |
| AI quota | count-then-act TOCTOU — confirmed (`ai/chat/route.ts`) |
| `db:push --accept-data-loss` | present in scripts — confirmed |
| Payment self-minting | CONFIRMED (`subscription/cancel/route.ts:9-22`) — CRITICAL |
| Session token in localStorage | CONFIRMED (hotfix tradeoff; ADR-004) |
| CSRF fail-open | CONFIRMED (`api.ts:21` — passes when Origin absent) |

## 7. Audit methodology note

Three parallel audit agents (backend, frontend/3D/PWA/i18n, AI/safety/billing) each verified findings against source with file:line citations; named-risk list independently re-verified by the lead agent; worklog entries: Task IDs 1-a, 1-b, 1-c, hotfix-login-1.
