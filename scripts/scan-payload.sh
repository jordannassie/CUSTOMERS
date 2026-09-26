#!/usr/bin/env bash
# Supply-chain payload scanner. Runs in CI on every PR, and locally from the
# pre-commit and pre-push hooks. Copied from the GCS portal repo; the same
# injection family hit this repo from 2026-08-12: a loader hidden on one line
# behind ~280 spaces in postcss.config, plus JavaScript disguised as a font file.
#
#   scripts/scan-payload.sh [PATH]   scan PATH (default: repo root)
#   scripts/scan-payload.sh --staged scan the git INDEX (what a commit would record)
#   scripts/scan-payload.sh --rev SHA  scan the full tree of one commit
#   scripts/scan-payload.sh --selftest
#
# Exit 0 clean, 1 findings, 2 scanner broken (NOT clean, never treat as pass).
#
# WHY THREE TARGETS. On 2026-09-06 the payload sat in the index while the working
# tree was clean, so a working-tree scan answered "clean" with the malware one
# `git commit` away. Content lives in three places in git and all three are
# reachable by an attacker; scanning one of them is not a control.

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

# Executable code hidden after whitespace padding. The tail must start with a
# non-space (else it re-matches the padding) and reach a runtime token (else
# padded comment banners and markdown tables in .d.ts files trip it).
# Bound stays under 255: POSIX RE_DUP_MAX makes BSD grep reject anything larger,
# and both observed variants put the token immediately after the padding anyway.
R_HIDDEN='[[:blank:]]{100,}[^[:blank:]*].{0,200}(require\(|global\[|global\.[a-z]|eval\(|Function\(|child_process|process\.env)'
# The same shape with the token starting IMMEDIATELY after the padding. This is
# not redundant: the rule above consumes that first character with
# `[^[:blank:]*]`, so `<pad>global.i="..."` ate its own `g` and then found no
# second token within 200 characters of obfuscated arithmetic. Measured on the
# real 2026-09-06 sample: rule above 0 matches, this rule 1. A one-character
# blind spot shaped exactly like the payload, green in CI for a month.
R_HIDDEN2='[[:blank:]]{100,}(require\(|global\[|global\.[a-z]|eval\(|Function\(|child_process|process\.env)'
# obfuscator.io identifier soup: three `_0x`-style names close together. Written
# as explicit repeats rather than a nested quantifier because ugrep rejects the
# nested form as too complex, and a pattern that errors makes the scan exit 2.
# Structural, so it survives the string-splitting that defeats every literal IOC.
R_OBF='_0x[0-9a-fA-F]{4,6}[^_]{0,40}_0x[0-9a-fA-F]{4,6}[^_]{0,40}_0x[0-9a-fA-F]{4,6}'
# A module name written as \uXXXX escapes. Bare escape density is NOT usable , 
# emoji-regex, iconv-lite and date-fns locales are legitimately full of them.
R_UNIESC='require\(["'"'"'](\\u[0-9a-fA-F]{4}){3,}'
# Known literals and build stamps from this campaign.
R_IOC='166\.88\.134\.62|a322[eE]5[fF]3[dD]311[dD]3080e6f0121063e9a[dD][cC]2490[eE]f1a|"Sec[-]V"|/0x/(clb|cls)|/\*M[0-9]{6}[A-Z]?\*/'

# An editor task that runs by itself when the folder is opened. The infected
# branches in this repo shipped one that ran JavaScript disguised as a font file.
R_AUTORUN='"runOn"[[:space:]]*:[[:space:]]*"folderOpen"'

EXCLUDES=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next
          --exclude-dir=coverage --exclude-dir=dist --exclude-dir=build
          --exclude='*.map' --exclude='*.min.js' --exclude='*.lock'
          # This file carries the IOC literals as detection patterns, so it
          # matches itself. Excluding by name keeps the signal honest.
          --exclude='scan-payload.sh')

scan() {
  local root="$1" found=0 out
  for rule in "HIDDEN:$R_HIDDEN" "HIDDEN2:$R_HIDDEN2" "OBF:$R_OBF" \
              "UNIESC:$R_UNIESC" "IOC:$R_IOC" "AUTORUN:$R_AUTORUN"; do
    local name="${rule%%:*}" pat="${rule#*:}"
    out=$(grep -rlE "${EXCLUDES[@]}" -- "$pat" "$root" 2>/dev/null)
    local rc=$?
    [ "$rc" -le 1 ] || { echo "scan: grep failed (exit $rc), scan did NOT complete"; exit 2; }
    if [ -n "$out" ]; then
      while IFS= read -r f; do
        [ -n "$f" ] || continue
        # Relative both times: in snapshot modes the absolute path is a temp
        # directory, which tells the reader nothing about which file is bad.
        echo "::error file=${f#"$root"/}::Possible injected payload ($name)"
        echo "  CRITICAL [$name] ${f#"$root"/}"
        found=1
      done <<< "$out"
    fi
  done
  return $found
}

selftest() {
  local t; t=$(mktemp -d) ok=1
  # Sample deliberately avoids literal campaign IOC strings, this file must not
  # trip the scanners that read it (the pre-commit hook scans the repo it lives in).
  printf 'module.exports={};%srequire("\\u0068\\u0074\\u0074\\u0070");\n' \
    "$(printf ' %.0s' $(seq 1 300))" > "$t/bad.js"
  printf '/**\n *%s@author Someone\n */\nmodule.exports={};\n' \
    "$(printf ' %.0s' $(seq 1 300))" > "$t/benign.js"
  printf 'export const a = 1;\n' > "$t/clean.ts"
  # The 2026-09-06 shape, which the pre-fix scanner scored 0 on: padding, then a
  # runtime token as the very first character, then obfuscator identifier soup.
  # Structure only, no campaign literals, so this file stays scannable itself.
  printf 'module.exports={};%sglobal.i="x";const _0x1a2b=_0x3c4d;function _0x5e6f(){}\n' \
    "$(printf ' %.0s' $(seq 1 300))" > "$t/bad2.js"
  mkdir -p "$t/.vscode"
  printf '{"tasks":[{"label":"x","runOptions":{"runOn": "folderOpen"}}]}\n' > "$t/.vscode/tasks.json"
  local out; out=$(scan "$t")
  grep -q "tasks.json" <<<"$out" || { echo "FAIL: missed an auto-run editor task"; ok=0; }
  grep -q "bad.js"    <<<"$out" || { echo "FAIL: missed known-bad sample"; ok=0; }
  grep -q "bad2.js"   <<<"$out" || { echo "FAIL: missed the 2026-09-06 padded-loader shape"; ok=0; }
  grep -q "benign.js" <<<"$out" && { echo "FAIL: false positive on padded JSDoc"; ok=0; }
  grep -q "clean.ts"  <<<"$out" && { echo "FAIL: false positive on clean file"; ok=0; }
  rm -rf "$t"
  [ "$ok" = 1 ] && { echo "selftest PASSED"; return 0; }
  echo "selftest FAILED, scanner cannot be trusted"; return 2
}

if [ "$MODE" = selftest ]; then selftest; exit $?; fi

# Materialise the index or a commit tree into a temp directory and scan that, so
# the same rules apply to every place git keeps content.
scan_snapshot() {
  local what="$1" tmp rc
  tmp=$(mktemp -d) || { echo "scan: mktemp failed, scan did NOT run"; exit 2; }
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" EXIT
  case "$MODE" in
    staged) git checkout-index --all --prefix="$tmp/" 2>/dev/null ;;
    rev) git archive "$REV" 2>/dev/null | tar -x -C "$tmp" ;;
  esac
  # An empty snapshot means the extraction failed, which must not read as clean.
  [ -n "$(ls -A "$tmp" 2>/dev/null)" ] || {
    echo "scan: could not materialise $what, scan did NOT run"; exit 2; }
  echo "Scanning $what for injected payloads..."
  scan "$tmp"; rc=$?
  return $rc
}

if [ "$MODE" = staged ] || [ "$MODE" = rev ]; then
  [ "$MODE" != rev ] || [ -n "$REV" ] || { echo "--rev needs a commit" >&2; exit 2; }
  label="the staged index"; [ "$MODE" = rev ] && label="commit ${REV}"
  if scan_snapshot "$label"; then
    echo "✓ clean, no injected payload found"
    exit 0
  fi
  echo
  echo "Injected payload detected in $label. This is how the malware reached main"
  echo "before (2026-08-12 onwards). Do NOT commit or push."
  exit 1
fi

echo "Scanning $TARGET for injected payloads..."
if scan "$TARGET"; then
  echo "✓ clean, no injected payload found"
  exit 0
fi
echo
echo "Injected payload detected. This is how the malware reached main before."
echo "Inspect the file(s) above; do NOT install or build until resolved."
exit 1
