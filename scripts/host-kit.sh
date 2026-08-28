#!/usr/bin/env bash
#
# INSTALLED from add-ons/packages/host-kit/scripts/install-host-kit.sh — by scripts/host-kit.sh.
# Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
# Run `npm run host-kit:status` here; it works with no kit beside it.
#
# install-host-kit.sh — vendor the AddOnHost seam into a host app, and prove the
# vendored copy has not drifted from the kit it came from.
#
# ── THIS FILE LIVES IN TWO PLACES, AND IT INSTALLS ITSELF INTO THE SECOND ───
#
#   add-ons/packages/host-kit/scripts/install-host-kit.sh   the original
#   <host>/scripts/host-kit.sh                              the copy it writes
#
# It runs from either end and works out which it is from where it sits. That is
# not cleverness for its own sake; it is the lesson `sync-add-ons.sh` opens with,
# obeyed. The anti-drift check for the add-ons used to live only in the author's
# gitignored workplan tree: the host's own source told a reader to "re-run the
# sync script", CI had no script to run, and a cloner could not have run one if
# they had wanted to. A GATE NOBODY BUT ONE LAPTOP CAN EXECUTE IS NOT A GATE. So
# the copy in the host is the point of the exercise, and with no kit checkout
# beside it that copy still runs, reports SOURCE-MISSING, and exits 0.
#
# The inverse arrangement — a thin wrapper here delegating to an implementation
# that ships in the host, which is what `add-ons/scripts/sync-to-host.sh` does —
# was considered and cannot work for THIS script, for one reason: a retrofit
# target has no implementation to delegate to. That is what "retrofit" means. The
# host acquires its copy by being installed into, so the first run must come from
# this end. Extending `sync-add-ons.sh` was the other candidate and is worse
# still: it is a file that ships in a host, so extending it means editing it in
# each host separately, which is the disease rather than the cure. The two
# scripts own DISJOINT TREES — that one writes `src/add-ons/vendor/`, this one
# writes `src/add-ons/kit/`, `src/testing/kit/` and `scripts/` — so there is no
# shared file list to fall out of step, which is the only kind of duplication
# worth avoiding here.
#
# ── WHAT LANDS WHERE, AND WHY IT IS TWO DIRECTORIES ─────────────────────────
#
#   <host>/src/add-ons/kit/       the RUNTIME half. Compiles into the bundle.
#   <host>/src/testing/kit/       the GUARD half. Must never ship.
#   <host>/scripts/host-kit.sh    this script, so the host owns its own gate.
#
# `INSTALL_LAYOUT` in `src/config.ts` records the argument in full. The short
# version: `guards/lexicon.ts` spells every banned word, so vendoring it into
# `src/add-ons/` would put that list one ordinary import away from a screen, and
# the failure would be a red release (17 §2 greps the built bundle) rather than a
# red test.
#
# NOT COPIED, and none of it is an oversight:
#   *.test.ts(x)       the kit runs its own suites; re-running them in a host
#                      would assert the copy rather than the thing.
#   host-kit.config.ts the host WRITES this one, by hand, once. It is host-owned
#                      and never synced — `status` refuses to compare it, and a
#                      missing one is reported as CONFIG-MISSING because the fix
#                      is to write it, not to re-run a sync.
#
# ── THE HOST'S OWN ENTRY POINT IS PART OF THE INSTALL ───────────────────────
#
# `status` FAILS with NO-SCRIPTS when the host's `package.json` does not declare
# `host-kit:status` and `host-kit:install`. That is not pedantry about npm: the
# two hosts that already carry the seam differ here, and the difference is a lost
# gate. `print-shop` declares `add-ons:status` / `add-ons:sync`; `maker-shop`
# ships the same `scripts/sync-add-ons.sh` and declares NEITHER, so its vendored
# tree has a checker with no documented way to run it and nothing in CI runs it.
# A script nobody is told to run is the same defect as a script nobody can run.
#
# The two lines are printed for pasting rather than written in. Editing a host's
# `package.json` from a shell means a JSON round trip, and a JSON round trip
# rewrites the whole file — reordering nothing but reformatting everything, and
# flattening escape sequences in any string that carries one. A three-line diff
# a reviewer can read beats a hundred-line one this script promises is harmless.
#
# Usage:
#   install-host-kit.sh status    what is installed, and whether it matches
#   install-host-kit.sh install   (re-)copy from the kit. `sync` is a synonym
#   install-host-kit.sh list      the file list each target contributes
#
# Environment:
#   HOST_DIR  the host checkout. Required when running from the kit.
#   KIT_DIR   the kit. Defaults to ../add-ons/packages/host-kit beside the host.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Which end is this? The kit is the checkout whose `../src/config.ts` is the
# kit's own contract file. Asking for a specific FILE rather than for a
# directory, because `<host>/scripts/` has a sibling `src/` too and a directory
# test would identify every host as the kit.
if [ -f "$HERE/../src/config.ts" ] && [ -f "$HERE/../package.json" ] &&
   grep -q '"@adminium/add-on-host-kit"' "$HERE/../package.json" 2>/dev/null; then
  KIT="$(cd "$HERE/.." && pwd)"
  HOST="${HOST_DIR:-}"
else
  HOST="$(cd "$HERE/.." && pwd)"
  KIT="${KIT_DIR:-$(cd "$HOST/.." && pwd)/add-ons/packages/host-kit}"
fi

die()  { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }
ok()   { printf '\033[32m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }

[ -n "$HOST" ] || die "set HOST_DIR to the host checkout to install into
  e.g. HOST_DIR=../../../print-shop bash scripts/install-host-kit.sh status"
[ -d "$HOST/src" ] || die "no src/ under $HOST — HOST_DIR does not name a host checkout"

# ---------------------------------------------------------------------------
# TARGETS
#
# Three, in the order they are written, and the order is the dependency order a
# reader would want: the runtime half first because the guard half imports it,
# the script last because it is the thing that checks both.
#
# `dest_of` is relative to the host root rather than to `src/`, because one of
# the three does not live under `src/` at all.
# ---------------------------------------------------------------------------
TARGETS=(runtime guards tooling)

# The runtime half. Every one of these compiles into the host's bundle, so the
# list is exactly what `src/index.ts` re-exports plus `index.ts` itself, and
# adding to it is a decision about what a browser downloads.
FILES_runtime=(
  config.ts
  slot-content.ts
  styles.ts
  AddOnSlot.tsx
  index.ts
)

# The guard half.
#
# EXPLICIT, LIKE EVERY OTHER LIST HERE, and this one earned its keep on the day
# it was written: the list was authored while the guard modules were still
# arriving, and the UNLISTED check below refused the install by name — twice —
# until it was brought back into step. That refusal is the whole reason the list
# is not a glob. THE KIT CANNOT SHIP A HALF OF ITS GUARD HALF: a host running
# nine of eleven guards and believing it runs eleven is the precise failure this
# package exists to end, and a glob would have installed whatever happened to be
# on disk and said nothing.
#
# Adding a guard is therefore one line here, and forgetting it is impossible
# rather than merely discouraged.
FILES_guards=(
  index.ts
  files.ts
  lexicon.ts
  brand.ts
  facts.ts
  label-pairing.ts
  mounts.ts
  payload-casts.ts
  styles.ts
  tier.ts
  vendored.ts
)

# This script, installing itself. One "file list" of one, so that it goes
# through the same header, the same comparison and the same refusal states as
# everything else rather than through a special case.
FILES_tooling=(
  install-host-kit.sh
)

# ── NAMED, AND DELIBERATELY NOT INSTALLED ───────────────────────────────────
#
# The UNLISTED check refuses any file in the kit that no list here names, which
# is what stops half a guard half reaching a host. But some files legitimately
# stay behind, and "not in FILES_*" cannot mean both "forgotten" and "decided" —
# so a decision is written down HERE, with its reason, and forgetting still
# fails.
#
# `*.test.ts(x)` is excluded by `in_kit_of` rather than listed, because it is a
# rule about a whole class of file rather than a decision about a particular
# one: the kit runs its own suites, and re-running them in a host would assert
# the copy rather than the thing.
SKIP_runtime=()
SKIP_guards=(
  # The kit's own fixture builder — it stands up a synthetic host in a temp
  # directory so a guard can be driven over a host that does not exist. A real
  # host has itself and needs none of it, and installing a temp-directory
  # scaffold into twelve apps is how a test helper ends up in a bundle.
  synthetic-host.ts
)
SKIP_tooling=()

dest_of() { # $1 = target → path relative to the host root
  case "$1" in
    runtime) printf 'src/add-ons/kit' ;;
    guards)  printf 'src/testing/kit' ;;
    tooling) printf 'scripts' ;;
    *)       die "unknown target $1" ;;
  esac
}

src_of() { # $1 = target → where its files come from, in the kit
  case "$1" in
    tooling) printf '%s/scripts' "$KIT" ;;
    runtime) printf '%s/src' "$KIT" ;;
    guards)  printf '%s/src/guards' "$KIT" ;;
    *)       die "unknown target $1" ;;
  esac
}

# The installed name, where it differs from the source name. Only the script
# renames: `install-host-kit.sh` describes what it does FROM THE KIT, and from
# inside a host the same file is the gate rather than the installer.
named_as() { # $1 = target, $2 = source file name
  if [ "$1" = tooling ]; then printf 'host-kit.sh'; else printf '%s' "$2"; fi
}

files_of() { local v; v="FILES_$1[@]"; printf '%s\n' "${!v}"; }
skipped_of() { local v; v="SKIP_$1[@]"; printf '%s\n' "${!v-}"; }

# Named anywhere in this script — installed, or deliberately left behind.
named_in() { # $1 = target, $2 = file name
  files_of "$1" | grep -qxF "$2" && return 0
  skipped_of "$1" | grep -qxF "$2" && return 0
  return 1
}

# The runtime half is a flat directory, so `find` would also sweep up the
# `.tsbuildinfo` and any editor droppings; the guard half is flat too. Both
# lists are compared against what is actually in the kit, and anything the list
# does not name is UNLISTED. `*.test.ts(x)` is excluded from that sweep because
# it is deliberately not copied — see the header.
in_kit_of() { # $1 = target → the files actually present in the kit, one per line
  local dir; dir="$(src_of "$1")"
  [ -d "$dir" ] || return 0
  ( cd "$dir" && find . -maxdepth 1 -type f \
      ! -name '*.test.ts' ! -name '*.test.tsx' ! -name '*.tsbuildinfo' \
      | sed 's|^\./||' | sort )
}

# ---------------------------------------------------------------------------
# REWRITES
#
# The kit's sources import the shared contract by package name, and the guard
# half imports the runtime half by a relative path that is only correct inside
# the kit. A host has neither: no `node_modules/@adminium/add-on-host`, and the
# two halves land in directories two levels apart. So both are rewritten on the
# way in, and `status` applies exactly the same rewrite to the SOURCE before
# comparing, so the rewrite is never itself a source of drift.
#
# TWO FUNCTIONS RATHER THAN ONE, because the two halves land at different
# depths and a single function taking a depth would have to be told which half
# it is looking at anyway. What is shared is the thing worth sharing: the
# spelling rules below.
#
# NO BACKREFERENCES IN ANY PATTERN. A capture-and-put-back `sed -E` with a \1 in
# the PATTERN is the obvious way to write "either quote style" and it is wrong:
# BSD ERE has no backreferences, so on macOS it matches nothing and every
# specifier is copied through untouched — SILENTLY, because `status` applies the
# same broken rewrite to the source and the two therefore still agree perfectly
# while the host fails to build. `unresolved_in` below is the check that caught
# that, and it stays. Both quote styles are spelled out instead.
#
# ORDER IS LOAD-BEARING in `rewrite_guards`: the relative rewrite runs first,
# and the package rewrite — whose replacement text itself begins `../../` —
# runs second. Reverse them and the second pass would rewrite the first pass's
# output. The `[^.]` guard on the relative pattern makes that safe either way,
# and both are here because one of them being enough is not a thing to rely on.
# ---------------------------------------------------------------------------
HOST_PKG_FROM_RUNTIME='../vendor/host'
HOST_PKG_FROM_GUARDS='../../add-ons/vendor/host'

rewrite_pkg() { # $1 = the vendored contract's path, relative to the file
  sed \
    -e "s|\"@adminium/add-on-host/contracts\"|\"$1/contracts/index.ts\"|g" \
    -e "s|'@adminium/add-on-host/contracts'|'$1/contracts/index.ts'|g" \
    -e "s|\"@adminium/add-on-host\"|\"$1/index.ts\"|g" \
    -e "s|'@adminium/add-on-host'|'$1/index.ts'|g"
}

rewrite_runtime() { rewrite_pkg "$HOST_PKG_FROM_RUNTIME"; }

rewrite_guards() {
  # `[^.]` after the `../` so a specifier that already climbs twice is left
  # alone. Nothing in the guard half may climb twice — `escapes_in` refuses it —
  # but a pattern that is correct on its own is worth more than a pattern that
  # is correct because of a check somewhere else.
  sed \
    -e "s|\"\\.\\./\\([^.]\\)|\"../../add-ons/kit/\\1|g" \
    -e "s|'\\.\\./\\([^.]\\)|'../../add-ons/kit/\\1|g" |
    rewrite_pkg "$HOST_PKG_FROM_GUARDS"
}

rewrite_of() { # $1 = target → filter stdin
  case "$1" in
    runtime) rewrite_runtime ;;
    guards)  rewrite_guards ;;
    tooling) cat ;;  # a shell script imports nothing; nothing to rewrite.
  esac
}

# ---------------------------------------------------------------------------
# HEADERS
#
# Five lines on every copied file, naming where it came from and saying it is
# synced rather than hand-edited. `status` cuts exactly these lines back off
# before comparing, so editing the wording here is a one-line change followed by
# an install, never a drift report.
#
# The offset exists for one file. A shell script's shebang MUST be its first
# line, so the script's header goes at line 2 and everything else's at line 1.
# One number, passed through, rather than a second copy of the strip-and-compare
# path — which is the same argument this whole package makes about everything
# else.
# ---------------------------------------------------------------------------
HEADER_LINES=5

header_offset_of() { case "$1" in tooling) printf 1 ;; *) printf 0 ;; esac; }

note_of() { # $1 = target → the header's third line
  case "$1" in
    runtime) printf '%s' 'The RUNTIME half: this compiles into the bundle.' ;;
    guards)  printf '%s' 'The GUARD half: suites import this; nothing that ships may.' ;;
    tooling) printf '%s' 'Run `npm run host-kit:status` here; it works with no kit beside it.' ;;
  esac
}

header() { # $1 = target, $2 = source file name, $3 = comment style
  local opener body closer
  if [ "$3" = hash ]; then opener='#'; body='#'; closer='#'
  else opener='/*'; body=' *'; closer=' */'; fi
  printf '%s\n' "$opener"
  printf '%s INSTALLED from add-ons/packages/host-kit/%s/%s — by scripts/host-kit.sh.\n' \
    "$body" "$(basename "$(src_of "$1")")" "$2"
  printf '%s Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.\n' "$body"
  printf '%s %s\n' "$body" "$(note_of "$1")"
  printf '%s\n' "$closer"
}

emit() { # $1 = target, $2 = source file name → the installed bytes, on stdout
  local src style offset
  src="$(src_of "$1")/$2"
  case "$1" in tooling) style=hash ;; *) style=block ;; esac
  offset="$(header_offset_of "$1")"
  if [ "$offset" -eq 1 ]; then head -n 1 "$src"; fi
  header "$1" "$2" "$style"
  tail -n "+$((offset + 1))" "$src" | rewrite_of "$1"
}

# ---------------------------------------------------------------------------
# REFUSALS
#
# Each has a distinct name because each calls for a different action, and a
# gate that reports every problem as "failed" is a gate whose output gets
# skimmed. In the order a reader is likely to meet them:
#
#   MISSING        a listed file is not installed          → install
#   DRIFT          an installed file differs from the kit  → install (or push
#                                                             the edit back)
#   EXTRA          an installed file nothing names         → delete it, or add
#                                                             it to a list here
#   UNRESOLVED     a specifier the host cannot resolve     → the rewrite did not
#                                                             fire; see REWRITES
#   ESCAPES        a kit source climbs out of its own half → fix the kit
#   UNLISTED       a kit file no list here names           → add it to a list
#   CONFIG-MISSING no host-kit.config.ts                   → write one by hand
#   NO-SCRIPTS     no npm entry point in the host          → paste two lines
#   SOURCE-MISSING no kit beside the host                  → nothing to compare
# ---------------------------------------------------------------------------

# Every bare `@adminium/…` specifier left in an installed file, one per line.
# There is nothing in a host that could resolve one: a survivor means the
# rewrite did not fire and the installed tree is not self-contained.
#
# IT LOOKS ONLY AT WHAT A BUNDLER WOULD FOLLOW, and the first run of this script
# is why that is stated so carefully. The obvious pattern — `(from|import)`
# followed by a quote — reported `guards/brand.ts` as UNRESOLVED on a line that
# reads `expect(bites("import { register } from '@adminium/…'"))`: a FIXTURE, a
# string the brand guard feeds to itself to prove it bites. Nothing imports it,
# nothing resolves it, and a refusal there would have made the kit uninstallable
# for a reason that does not exist. A gate that cries wolf on its own test data
# is a gate somebody deletes.
#
# So: a statement whose line STARTS with `import`/`export` and reaches its
# specifier without crossing another quote, or a dynamic `import(` that is not
# itself inside a string. Prose that names the package — every one of these files
# explains what it is a copy of — was never a false positive and still is not.
unresolved_in() { # $1 = file
  local q="['\"]" notq="[^'\"]" pre="[^A-Za-z0-9_.'\"]"
  grep -nE "^[[:space:]]*(import|export)[[:space:]]${notq}*${q}@adminium/" "$1" || true
  grep -nE "(^|${pre})import[[:space:]]*\([[:space:]]*${q}@adminium/" "$1" || true
}

# A guard source reaching further up than the kit's own `src/`. Nothing legally
# does — `src/guards/x.ts` climbs once to reach `src/` and no further — and the
# relative rewrite is written for exactly one level. Checked at the SOURCE, so
# the message names a file in the kit, which is where the fix is.
escapes_in() { # $1 = file
  grep -nE "(from|import)[[:space:]]*\(?[[:space:]]*['\"]\.\./\.\./" "$1" || true
}

KIT_PRESENT=1
[ -d "$KIT/src" ] || KIT_PRESENT=0

require_kit() {
  [ "$KIT_PRESENT" -eq 1 ] && return 0
  printf 'no host kit at:\n  %s\n' "$KIT" >&2
  die "clone the add-ons monorepo beside this host, or set KIT_DIR to where it lives"
}

# ---------------------------------------------------------------------------

cmd_list() {
  require_kit
  printf '%-10s %-22s %s\n' TARGET INSTALLS-INTO FILES
  for key in "${TARGETS[@]}"; do
    printf '%-10s %-22s %s\n' "$key" "$(dest_of "$key")" "$(files_of "$key" | wc -l | tr -d ' ')"
    while IFS= read -r rel; do
      printf '    %s\n' "$(named_as "$key" "$rel")"
    done < <(files_of "$key")
    while IFS= read -r rel; do
      [ -n "$rel" ] && printf '    %s  (named, not installed)\n' "$rel"
    done < <(skipped_of "$key")
  done
  printf '\nhost-owned, never synced: src/%s\n' 'add-ons/host-kit.config.ts'
}

# ---------------------------------------------------------------------------

cmd_install() {
  require_kit
  local total=0
  for key in "${TARGETS[@]}"; do
    local src dest n=0
    src="$(src_of "$key")"
    dest="$HOST/$(dest_of "$key")"
    mkdir -p "$dest"

    # Refuse before writing anything for this target, so a kit that has grown a
    # guard nobody listed does not leave a half-installed tree behind.
    while IFS= read -r present; do
      named_in "$key" "$present" ||
        die "UNLISTED $key/$present — it is in the kit and named nowhere in this script.
add it to FILES_$key to install it, or to SKIP_$key with the reason it stays behind"
    done < <(in_kit_of "$key")

    while IFS= read -r rel; do
      local out
      [ -f "$src/$rel" ] || die "$key: $rel is in the file list but not in the kit"
      if [ "$key" = guards ] || [ "$key" = runtime ]; then
        local climbs
        climbs="$(escapes_in "$src/$rel")"
        [ -z "$climbs" ] || die "ESCAPES $key/$rel reaches outside the kit's own src/:
$climbs
the install rewrites one level and cannot follow this — fix the kit"
      fi
      out="$dest/$(named_as "$key" "$rel")"
      emit "$key" "$rel" > "$out"
      [ "$key" = tooling ] && chmod +x "$out"
      local left
      left="$(unresolved_in "$out")"
      [ -z "$left" ] || die "UNRESOLVED $key/$rel still imports a package by name:
$left
the import rewrite did not fire — see REWRITES in this script"
      n=$((n + 1))
    done < <(files_of "$key")

    printf '%-10s %-22s %s files\n' "$key" "$(dest_of "$key")" "$n"
    total=$((total + n))
  done
  ok "installed $total files into $HOST"
  echo
  config_advice
  scripts_advice
  echo "then run, in $HOST:  npx tsc -b && npx vitest run"
}

config_advice() {
  [ -f "$HOST/src/add-ons/host-kit.config.ts" ] && return 0
  warn 'CONFIG-MISSING: src/add-ons/host-kit.config.ts'
  printf '  the host writes this one by hand, once. See the kit README, step 4.\n\n'
}

scripts_advice() {
  host_scripts_ok && return 0
  warn 'NO-SCRIPTS: the host declares no entry point for this gate'
  printf '  paste into %s/package.json "scripts":\n\n' "$HOST"
  printf '    "host-kit:status": "bash scripts/host-kit.sh status",\n'
  printf '    "host-kit:install": "bash scripts/host-kit.sh install"\n\n'
}

# Read as text, deliberately. Parsing the JSON would mean a JSON tool this host
# may not have, and the question being asked — does the string appear as a key —
# is exactly a text question.
host_scripts_ok() {
  local pkg="$HOST/package.json"
  [ -f "$pkg" ] || return 1
  grep -q '"host-kit:status"' "$pkg" && grep -q '"host-kit:install"' "$pkg"
}

# ---------------------------------------------------------------------------

cmd_status() {
  local drift=0
  printf '%-10s %-22s %-8s %s\n' TARGET INSTALLED-AT FILES STATE
  for key in "${TARGETS[@]}"; do
    local src dest state=ok n=0 want offset
    src="$(src_of "$key")"
    dest="$HOST/$(dest_of "$key")"
    want=$(files_of "$key" | wc -l | tr -d ' ')
    offset="$(header_offset_of "$key")"

    if [ ! -d "$dest" ]; then
      state="MISSING"; drift=1
    else
      while IFS= read -r rel; do
        local installed="$dest/$(named_as "$key" "$rel")"
        if [ ! -f "$installed" ]; then
          state="MISSING $(named_as "$key" "$rel")"; drift=1; continue
        fi
        n=$((n + 1))
        # Checked directly rather than left to the byte comparison below, which
        # cannot see it: the same rewrite is applied to both sides, so a rewrite
        # that fires on NEITHER produces two files that agree perfectly and a
        # build that fails. This is the check that caught the BSD backreference.
        [ -z "$(unresolved_in "$installed")" ] || { state="UNRESOLVED $rel"; drift=1; }
        # Cut the header back off, re-emit the source through the same rewrite,
        # then compare byte for byte. With no kit beside us there is nothing to
        # compare to, and saying so is honest where claiming "ok" would not be.
        if [ "$KIT_PRESENT" -eq 1 ] && [ -f "$src/$rel" ]; then
          if ! { if [ "$offset" -eq 1 ]; then head -n "$offset" "$installed"; fi
                 tail -n "+$((offset + HEADER_LINES + 1))" "$installed"; } |
               cmp -s - <(
                 if [ "$offset" -eq 1 ]; then head -n "$offset" "$src/$rel"; fi
                 tail -n "+$((offset + 1))" "$src/$rel" | rewrite_of "$key"
               ); then
            state="DRIFT $rel"; drift=1
          fi
        fi
      done < <(files_of "$key")

      # Anything under the destination that no list names. `scripts/` is a
      # directory the host owns and fills with its own tools, so only the
      # tooling target's own name is checked there — an EXTRA sweep over a
      # host's `scripts/` would report every script the host wrote.
      if [ "$key" != tooling ]; then
        while IFS= read -r extra; do
          files_of "$key" | grep -qxF "$extra" || { state="EXTRA $extra"; drift=1; }
        done < <(cd "$dest" && find . -type f | sed 's|^\./||' | sort)
      fi

      # A file in the kit that no list here names. Source-side, so it reports
      # on a clean host too, and so a guard added to the kit cannot reach nine
      # of eleven hosts unnoticed.
      if [ "$KIT_PRESENT" -eq 1 ]; then
        while IFS= read -r present; do
          named_in "$key" "$present" || { state="UNLISTED $present"; drift=1; }
        done < <(in_kit_of "$key")
      fi

      [ "$KIT_PRESENT" -eq 0 ] && [ "$state" = ok ] && state="SOURCE-MISSING (not compared)"
    fi
    printf '%-10s %-22s %-8s %s\n' "$key" "$(dest_of "$key")" "$n/$want" "$state"
  done

  echo
  if [ ! -f "$HOST/src/add-ons/host-kit.config.ts" ]; then
    warn 'CONFIG-MISSING src/add-ons/host-kit.config.ts — host-owned; write it by hand (README step 4)'
    drift=1
  fi
  if ! host_scripts_ok; then
    warn 'NO-SCRIPTS package.json declares neither host-kit:status nor host-kit:install'
    printf '  a gate with no documented way to run it is the defect maker-shop already has\n'
    drift=1
  fi

  # Two of the states above are NOT fixed by re-installing — the config and the
  # npm scripts are host-owned by design — so the closing line does not tell a
  # reader to run a command that would leave the report unchanged and teach them
  # that the report lies.
  if [ "$drift" -ne 0 ]; then
    echo
    printf 'file drift is fixed by:  bash scripts/host-kit.sh install\n' >&2
    printf 'CONFIG-MISSING and NO-SCRIPTS are host-owned and fixed by hand.\n' >&2
    die 'not clean'
  fi
  if [ "$KIT_PRESENT" -eq 0 ]; then
    warn "the installed files are complete; no kit beside this host, so nothing was compared"
    printf '  %s\n' "$KIT"
    exit 0
  fi
  ok "the installed kit matches $KIT"
}

case "${1:-status}" in
  status)       cmd_status ;;
  install|sync) cmd_install ;;
  list)         cmd_list ;;
  *) die "usage: host-kit.sh [status|install|list]" ;;
esac
