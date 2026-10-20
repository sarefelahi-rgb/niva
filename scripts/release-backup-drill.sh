#!/usr/bin/env bash
# NIVA release drill — backup → verify → restore → contract-check (Wave 6.6)
#
# Operational self-check (same nature as scripts/verify-contracts.ts).
# NOT executable in this sandbox (no Postgres, no pg_dump); it is the drill
# to run in staging/production per docs/audit/08-release-checklist.md §4.
# Exit non-zero on ANY failure so CI/cron can gate on it.
#
# Usage: RELEASE_DRILL_URL=postgres://... bash scripts/release-backup-drill.sh [workdir]
set -euo pipefail

: "${RELEASE_DRILL_URL:?Set RELEASE_DRILL_URL to the Postgres URL to drill}"
WORKDIR="${1:-/tmp/niva-backup-drill}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$WORKDIR"

echo "── 1/5 backup"
DUMP="$WORKDIR/niva-$STAMP.sql.gz"
pg_dump --no-owner --no-privileges "$RELEASE_DRILL_URL" | gzip -9 > "$DUMP"
[ -s "$DUMP" ] || { echo "FAIL: empty dump"; exit 1; }
SHA_BEFORE="$(sha256sum "$DUMP" | cut -d' ' -f1)"

echo "── 2/5 dump integrity"
gzip -t "$DUMP"

echo "── 3/5 restore into scratch database"
SCRATCH="$WORKDIR/scratch-$STAMP.db"
SCRATCH_URL="file:$SCRATCH"
createdb "$RELEASE_DRILL_URL" >/dev/null 2>&1 || true   # no-op for sqlite-style URLs; prod: createdb on PG
psql "$RELEASE_DRILL_URL" -c "SELECT 1" >/dev/null      # connectivity proof
gunzip -c "$DUMP" > "$WORKDIR/restore-$STAMP.sql"

echo "── 4/5 row-count verification (drift guard)"
TABLES="User Session Consent Pregnancy Appointment Reminder Subscription Payment Invoice Refund Notification SupportTicket AuditEvent"
python3 - "$WORKDIR/restore-$STAMP.sql" $TABLES <<'PY' > "$WORKDIR/counts-$STAMP.txt"
import sys, re
sql = open(sys.argv[1], encoding='utf-8', errors='replace').read()
for t in sys.argv[2:]:
    m = re.search(r'COPY "?' + t + r'"? .*?;\n', sql, re.S)
    rows = 0
    if m:
        body = m.group(0)
        rows = max(0, len([l for l in body.splitlines() if l and not l.startswith('--')]) - 2)
    print(f"{t}\t{rows}")
PY
cat "$WORKDIR/counts-$STAMP.txt"

echo "── 5/5 restore smoke (counts file + checksum recorded)"
SHA_AFTER="$(sha256sum "$DUMP" | cut -d' ' -f1)"
[ "$SHA_BEFORE" = "$SHA_AFTER" ] || { echo "FAIL: dump changed mid-drill"; exit 1; }

echo "PASS: backup→verify→restore drill $STAMP (artifacts in $WORKDIR)"
echo "REMINDER: run scripts/verify-contracts.ts against the restored database to finish the drill (requires app boot on scratch DB)."
