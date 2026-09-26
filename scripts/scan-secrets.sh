#!/usr/bin/env bash
# Credential scanner. Blocks committing or pushing secrets, which is the other
# half of the 2026-09-06 incident: the payload's whole purpose was to read the
# keys sitting on a developer machine.
#
#   scripts/scan-secrets.sh [PATH]     scan PATH (tracked files only)
#   scripts/scan-secrets.sh --staged   scan the git INDEX (what a commit records)
#   scripts/scan-secrets.sh --rev SHA  scan the full tree of one commit
#   scripts/scan-secrets.sh --selftest
#
# A genuine non-secret that matches a rule (a published local-dev default, a test
# fixture) is silenced by putting `scan-secrets:allow` on the SAME line, with a
# comment saying why. Same line, because a marker that can drift away from what it
# excuses is a marker that eventually excuses the wrong thing.
#
# Exit 0 clean, 1 findings, 2 scanner broken (NOT clean, never treat as pass).
#
# Deliberately a separate script from scan-payload.sh with its own copy of the
# snapshot logic. Two independent detectors that cannot fail together is worth
# more here than the handful of shared lines it costs.

set -uo pipefail

MODE=scan; TARGET=""; REV=""
while [ $# -gt 0 ]; do
  case "$1" in
    --selftest) MODE=selftest ;;
    --staged) MODE=staged ;;
    --rev) MODE=rev; REV="${2:-}"; shift ;;
    -*) echo "unknown flag: $1" >&2; exit 2 ;;
    *) TARGET="$1" ;;
  esac
  shift
done
TARGET="${TARGET:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"

command -v grep >/dev/null 2>&1 || { echo "scan: grep missing, scan did NOT run"; exit 2; }

# Provider-shaped keys. Each is anchored on a vendor prefix and a length, so a
# variable merely NAMED "token" does not trip it.
R_PRIVKEY='-----BEGIN [A-Z ]{0,20}PRIVATE KEY-----'
R_AWS='AKIA[0-9A-Z]{16}'
R_GOOGLE='AIza[0-9A-Za-z_-]{35}'
R_SUPABASE='sb_secret_[A-Za-z0-9_-]{16,}'
R_GITHUB='gh[pousr]_[A-Za-z0-9]{30,}'
R_SLACK='hooks\.slack\.com/services/[A-Za-z0-9]{8,}/[A-Za-z0-9]{8,}/[A-Za-z0-9]{16,}'
R_STRIPE='sk_live_[A-Za-z0-9]{16,}'
# A signed JWT, which is what every legacy Supabase service-role key looks like.
R_JWT='eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}'
# A long literal assigned to a secret-shaped name. Placeholders are excluded by
# requiring a mix of cases or digits, which "your-key-here" and "xxxxxxxx" lack.
R_ASSIGN='(SECRET|PASSWORD|PASSWD|API_?KEY|PRIVATE_?KEY|ACCESS_?TOKEN|AUTH_?TOKEN)[A-Za-z_]{0,12}["'"'"']?[[:blank:]]*[:=][[:blank:]]*["'"'"'][A-Za-z0-9_+/-]{24,}["'"'"']'

EXCLUDES=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next
          --exclude-dir=coverage --exclude-dir=dist --exclude-dir=build
          --exclude-dir=.memsearch
          # Bundled third-party skill tooling, not this project's code.
          --exclude-dir=.claude --exclude-dir=.agents
          --exclude='*.map' --exclude='*.min.js' --exclude='*.lock'
          # These files carry the patterns themselves, as detection rules or as
          # documentation of the incident.
          --exclude='scan-secrets.sh' --exclude='scan-payload.sh'
          --exclude='*.md' --exclude='*.html')

# Env files must never be committed. The example variants exist to be committed.
env_files() {
  local root="$1"
  find "$root" -type f \( -name '.env' -o -name '.env.*' \) \
    ! -name '*.example' ! -name '*.sample' ! -name '*.template' \
    -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null
}

# A line carrying this marker is skipped. It exists so the rules can stay strict:
# without a reviewed escape hatch, one unavoidable match (a published local-dev
# default, a test fixture) gets the whole hook switched off, which is worse.
ALLOW='scan-secrets:allow'

scan() {
  local root="$1" found=0 out hit file line
  for rule in "PRIVATE-KEY:$R_PRIVKEY" "AWS-KEY:$R_AWS" "GOOGLE-KEY:$R_GOOGLE" \
              "SUPABASE-SECRET:$R_SUPABASE" "GITHUB-TOKEN:$R_GITHUB" \
              "SLACK-WEBHOOK:$R_SLACK" "STRIPE-LIVE-KEY:$R_STRIPE" \
              "JWT:$R_JWT" "SECRET-ASSIGNMENT:$R_ASSIGN"; do
    local name="${rule%%:*}" pat="${rule#*:}"
    # -n for line numbers, so a finding can be located without this script ever
    # printing the matched text: echoing a secret into CI logs leaks it again.
    out=$(grep -rnE "${EXCLUDES[@]}" -- "$pat" "$root" 2>/dev/null)
    local rc=$?
    [ "$rc" -le 1 ] || { echo "scan: grep failed (exit $rc), scan did NOT complete"; exit 2; }
    if [ -n "$out" ]; then
      while IFS= read -r hit; do
        [ -n "$hit" ] || continue
        case "$hit" in *"$ALLOW"*) continue ;; esac
        file="${hit%%:*}"; hit="${hit#*:}"; line="${hit%%:*}"
        echo "::error file=${file#"$root"/},line=${line}::Possible committed credential ($name)"
        echo "  CRITICAL [$name] ${file#"$root"/}:${line}"
        found=1
      done <<< "$out"
    fi
  done
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    echo "::error file=${f#"$root"/}::Env file must not be committed"
    echo "  CRITICAL [ENV-FILE] ${f#"$root"/}"
    found=1
  done <<< "$(env_files "$root")"
  return $found
}

selftest() {
  local t ok=1; t=$(mktemp -d)
  # Samples are assembled from pieces so this file never contains a contiguous
  # credential-shaped string of its own.
  printf 'const a="%s%s";\n' 'AKIA' 'ABCDEFGHIJKLMNOP' > "$t/aws.js"
  printf 'const b="%s%s";\n' 'sb_secret_' 'abcdefghijklmnopqrst' > "$t/supa.js"
  printf -- '-----BEGIN RSA %s KEY-----\n' 'PRIVATE' > "$t/key.pem"
  printf 'API_KEY = "abcdEFGH1234ijklMNOP5678qrst"\n' > "$t/assign.py"
  printf 'FOO=bar\n' > "$t/.env.local"
  # Must NOT fire: placeholders, public keys, and example env files.
  printf 'const c="your-api-key-here";\nconst d="xxxxxxxxxxxxxxxxxxxxxxxx";\n' > "$t/placeholder.js"
  printf 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_abcdefghijklmnop\n' > "$t/.env.example"
  printf 'export const x = 1;\n' > "$t/clean.ts"
  local out; out=$(scan "$t")
  for want in aws.js supa.js key.pem assign.py .env.local; do
    grep -q "$want" <<<"$out" || { echo "FAIL: missed $want"; ok=0; }
  done
  for unwanted in placeholder.js .env.example clean.ts; do
    grep -q "$unwanted" <<<"$out" && { echo "FAIL: false positive on $unwanted"; ok=0; }
  done
  rm -rf "$t"
  [ "$ok" = 1 ] && { echo "secret selftest PASSED"; return 0; }
  echo "secret selftest FAILED, scanner cannot be trusted"; return 2
}

if [ "$MODE" = selftest ]; then selftest; exit $?; fi

scan_snapshot() {
  local what="$1" tmp rc
  tmp=$(mktemp -d) || { echo "scan: mktemp failed, scan did NOT run"; exit 2; }
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" EXIT
  case "$MODE" in
    staged) git checkout-index --all --prefix="$tmp/" 2>/dev/null ;;
    rev) git archive "$REV" 2>/dev/null | tar -x -C "$tmp" ;;
  esac
  [ -n "$(ls -A "$tmp" 2>/dev/null)" ] || {
    echo "scan: could not materialise $what, scan did NOT run"; exit 2; }
  echo "Scanning $what for committed credentials..."
  scan "$tmp"; rc=$?
  return $rc
}

if [ "$MODE" = staged ] || [ "$MODE" = rev ]; then
  [ "$MODE" != rev ] || [ -n "$REV" ] || { echo "--rev needs a commit" >&2; exit 2; }
  label="the staged index"; [ "$MODE" = rev ] && label="commit ${REV}"
  if scan_snapshot "$label"; then
    echo "✓ clean, no credentials found"
    exit 0
  fi
  echo
  echo "Credential detected in $label. Remove it, then rotate the key: once a"
  echo "secret has been committed, assume it is public."
  exit 1
fi

echo "Scanning $TARGET for committed credentials..."
if scan "$TARGET"; then
  echo "✓ clean, no credentials found"
  exit 0
fi
echo
echo "Credential detected. Remove it, then rotate the key."
exit 1
