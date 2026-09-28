#!/bin/zsh
# Exit (waking the leader) when a tmux worker's Claude turn ends ("· done <time>" twice with no spinner
# or running shells) or when a new non-draft PR appears on GitHub. Run it with run_in_background.
# Usage: LEADER_REPO=owner/name [LEADER_IGNORE_PRS="3 7"] [LEADER_SEEN=file] twatch.sh <tmux sessions...>
SEEN=${LEADER_SEEN:-${0:h}/reviewed-prs.txt}
touch $SEEN
typeset -A seen
while true; do
  for pr in $(gh pr list --repo "${LEADER_REPO:?set LEADER_REPO=owner/name}" --state open --json number,isDraft --jq '.[] | select(.isDraft == false) | .number' 2>/dev/null); do
    [[ " ${LEADER_IGNORE_PRS:-} " == *" $pr "* ]] && continue
    if ! grep -qx "$pr" $SEEN; then echo "pr $pr ready"; exit 0; fi
  done
  for s in "$@"; do
    tail=$(tmux capture-pane -p -t "$s" 2>/dev/null | grep -v '^\s*$' | tail -12)
    [[ -z "$tail" ]] && continue
    # "still running" means the worker is waiting on its own background job and will resume.
    if echo "$tail" | grep -qE '… \(|esc to interrupt|still running'; then seen[$s]=0
    elif echo "$tail" | grep -qE '· done [0-9]'; then seen[$s]=$(( ${seen[$s]:-0} + 1 ))
    fi
    if (( ${seen[$s]:-0} >= 2 )); then echo "session $s finished"; echo "$tail"; exit 0; fi
  done
  sleep 20
done
