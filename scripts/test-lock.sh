# Sourced by the test scripts: machine-wide locks shared by every worktree and clone on this machine (INFRA-02).
# Each lock is a flock(2) on a file under TEST_LOCK_DIR, taken through perl because macOS has no flock command.
# The lock belongs to the open descriptor, so child processes keep holding it, and the kernel drops it when the last
# process holding that descriptor exits, even after a crash or kill -9. Nothing can go stale.

TEST_LOCK_DIR="${TEST_LOCK_DIR:-/tmp/customers-direct-test}"
mkdir -p "$TEST_LOCK_DIR"

# test_lock <fd> <sh|ex|un>: one try, without waiting, on the file open on <fd>.
test_lock() {
  perl -MFcntl=:flock -e 'open(my $f, ">&=", $ARGV[0]) or exit 2;
    my %mode = (sh => LOCK_SH, ex => LOCK_EX, un => LOCK_UN);
    exit(flock($f, $mode{$ARGV[1]} | LOCK_NB) ? 0 : 1)' "$1" "$2"
}

# test_lock_wait <fd> <sh|ex> <minutes> <message>: tries every 2 seconds, printing the message once.
test_lock_wait() {
  local waited=0
  test_lock "$1" "$2" && return 0
  echo "$4" >&2
  until test_lock "$1" "$2"; do
    if [ "$waited" -ge $(($3 * 60)) ]; then
      echo "Still busy after $3 minutes, giving up. Try again later." >&2
      return 1
    fi
    sleep 2
    waited=$((waited + 2))
  done
  echo "Waited ${waited}s, going on." >&2
}
