#!/bin/zsh
# Start a worker in its own tmux session (watch it with: tmux attach -t <name>), wait for Claude's
# input box, then point it at its brief file. Long briefs are never typed: typed text gets cut off.
# Usage: tlaunch.sh <session-name> <worktree-dir> <brief-file>
NAME=$1; DIR=$2; BRIEF=$3
tmux new-session -d -s "$NAME" -x 200 -y 50 -c "$DIR" "env -u CLAUDE_CODE_CHILD_SESSION zsh -l"
sleep 3
tmux send-keys -t "$NAME" -l "claude"; tmux send-keys -t "$NAME" Enter
for i in $(seq 90); do tmux capture-pane -p -t "$NAME" | grep -q 'auto mode' && break; sleep 2; done
sleep 2
tmux send-keys -t "$NAME" -l "Read your full task brief in $BRIEF and follow it exactly."
sleep 1; tmux send-keys -t "$NAME" Enter
sleep 8; tmux capture-pane -p -t "$NAME" | grep -v '^\s*$' | tail -4 | head -2
