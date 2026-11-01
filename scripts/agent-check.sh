#!/bin/sh
# Stop hook: checks whatever an agent turn left uncommitted. Exit 2 hands the failure back to the agent.
# A clean tree and a state that already passed cost nothing, and the agent gets one forced retry per turn.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0
case "$(cat)" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0;; esac

paths='src tests tools quests scripts'
state=$(git status --porcelain -- $paths; git ls-files -mo --exclude-standard -- $paths | while read -r f; do [ -f "$f" ] && cksum "$f"; done)
[ -n "$state" ] || exit 0
stamp=$(git rev-parse --git-path agent-check)
sum=$(printf %s "$state" | cksum)
[ "$(cat "$stamp" 2>/dev/null)" = "$sum" ] && exit 0

refuse(){ printf '%s\n' "$1" | grep -v '^✔' | head -60 >&2; exit 2; }
out=$(tools/questlab/ql test 2>&1) || refuse "$out"
case "$state" in *quests/*|*tools/questlab/*|*src/quest-*|*src/freight-world*|*src/freight-sea*)
 out=$(tools/questlab/ql gates 2>&1) || refuse "$out";;
esac
printf %s "$sum" > "$stamp" 2>/dev/null
exit 0
