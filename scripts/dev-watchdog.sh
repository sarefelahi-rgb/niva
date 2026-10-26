#!/bin/bash
# NIVA sandbox watchdog — keeps the dev stack alive across OOM kills.
#
# Context: the sandbox reaps every process spawned from agent tool-call shells,
# and the boot-time Next.js server was OOM-killed (RSS ~2.5GB on a 4GB box).
# This watchdog is started double-forked (reparented to PID 1) so it survives
# tool-call cleanup, and it supervises:
#   1. Next.js dev server (port 3000) — restarted when down, recycled when RSS explodes
#   2. mini-services/scheduler (bun --hot)
#
# Log: /home/z/my-project/.zscripts/watchdog.log

PROJECT_DIR="/home/z/my-project"
LOG_FILE="$PROJECT_DIR/.zscripts/watchdog.log"
MAX_RSS_KB=3000000  # recycle next-server above ~3GB RSS to preempt the OOM killer

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

next_pid() {
  pgrep -f "next dev" | head -1
}

ensure_next() {
  local pid
  pid="$(next_pid)"
  if [ -n "$pid" ]; then
    # RSS guard: recycle a bloated server before the kernel OOM killer does.
    local rss
    rss="$(awk '/VmRSS/{print int($2)}' "/proc/$pid/status" 2>/dev/null || echo 0)"
    if [ "${rss:-0}" -gt "$MAX_RSS_KB" ]; then
      log "next-server RSS ${rss}kB > ${MAX_RSS_KB}kB — recycling (pre-OOM)"
      kill "$pid" 2>/dev/null
      sleep 3
      return
    fi
    return
  fi
  # Down → start. Double-fork so the server is a child of PID 1, not this shell.
  log "next dev down — starting"
  (
    cd "$PROJECT_DIR"
    setsid nohup bun run dev >> "$PROJECT_DIR/dev.log" 2>&1 < /dev/null &
  )
  local i=0
  while [ $i -lt 40 ]; do
    if curl -sf -m 5 -o /dev/null http://localhost:3000/; then
      log "next dev is up"
      return
    fi
    i=$((i + 1))
    sleep 2
  done
  log "next dev did not become ready in 80s (will retry next loop)"
}

ensure_scheduler() {
  if pgrep -f "mini-services/scheduler" > /dev/null 2>&1 || pgrep -f -- "--hot index.ts" > /dev/null 2>&1; then
    return
  fi
  log "scheduler down — starting"
  (
    cd "$PROJECT_DIR/mini-services/scheduler"
    setsid nohup bun --hot index.ts >> "$PROJECT_DIR/.zscripts/mini-service-scheduler.log" 2>&1 < /dev/null &
  )
}

log "watchdog started (pid $$)"
while true; do
  ensure_next
  ensure_scheduler
  sleep 15
done
