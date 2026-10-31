#!/bin/bash
#
# Self-checking test for scripts/lib/frontend-asset-retention.sh.
#
#   ./scripts/lib/frontend-asset-retention.test.sh
#
# NOT run by CI, like mask-in-actions.test.sh: the repository has no shell test
# harness. Run it by hand when touching the helper. Only the pure functions are
# covered; the S3 calls around them are not.

set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
source ./scripts/lib/frontend-asset-retention.sh

FAILURES=0

expect_output() {
    local description="$1" expected="$2" actual="$3"

    if [ "$actual" = "$expected" ]; then
        echo "  ok    $description"
    else
        echo "  FAIL  $description"
        echo "        expected: $(printf '%q' "$expected")"
        echo "        actual:   $(printf '%q' "$actual")"
        FAILURES=$((FAILURES + 1))
    fi
}

echo "stale_manifests"

expect_output "drops all but the newest N, whatever order they are listed in" \
    "deploys/20261001T000000Z.txt
deploys/20261002T000000Z.txt" \
    "$(printf '%s\n' \
        deploys/20261004T000000Z.txt \
        deploys/20261001T000000Z.txt \
        deploys/20261003T000000Z.txt \
        deploys/20261002T000000Z.txt \
        | stale_manifests 2)"

expect_output "drops nothing when there are N or fewer" \
    "" \
    "$(printf '%s\n' deploys/20261001T000000Z.txt | stale_manifests 2)"

echo "stale_assets"

KEEP_FILE=$(mktemp)
trap 'rm -f "$KEEP_FILE"' EXIT
printf '%s\n' assets/index-AAAA.js assets/vendor-BBBB.js > "$KEEP_FILE"

expect_output "lists the bucket's assets that no kept build names" \
    "assets/index-OLD1.js
assets/HomePage-OLD2.js" \
    "$(printf '%s\n' \
        assets/index-AAAA.js \
        assets/index-OLD1.js \
        assets/vendor-BBBB.js \
        assets/HomePage-OLD2.js \
        | stale_assets "$KEEP_FILE")"

expect_output "matches whole keys, not substrings" \
    "assets/index-AAAA.js.map" \
    "$(printf '%s\n' assets/index-AAAA.js assets/index-AAAA.js.map \
        | stale_assets "$KEEP_FILE")"

: > "$KEEP_FILE"
expect_output "refuses to judge anything stale against an empty keep list" \
    "" \
    "$(printf '%s\n' assets/index-AAAA.js | stale_assets "$KEEP_FILE" 2>/dev/null)"
stale_assets "$KEEP_FILE" < /dev/null 2>/dev/null
expect_output "and fails when asked to" "1" "$?"

echo "require_retention_tools"

# A PATH holding only the named tools, linked from the real ones.
TOOLS_DIR=$(mktemp -d)
trap 'rm -f "$KEEP_FILE"; rm -rf "$TOOLS_DIR"' EXIT
only_tools() {
    rm -f "$TOOLS_DIR"/*
    local tool
    for tool in "$@"; do ln -s "$(command -v "$tool")" "$TOOLS_DIR/$tool"; done
}

only_tools jq head
PATH="$TOOLS_DIR" require_retention_tools > /dev/null 2>&1
expect_output "passes with jq and GNU head" "0" "$?"

only_tools head
expect_output "names jq when it is missing" \
    "❌ jq is required to prune old frontend assets" \
    "$(PATH="$TOOLS_DIR" require_retention_tools 2>&1)"

only_tools jq
expect_output "names head when it is missing" \
    "❌ GNU head is required to prune old frontend assets" \
    "$(PATH="$TOOLS_DIR" require_retention_tools 2>&1)"

# BSD head, as on macOS, rejects a negative line count.
printf '#!/bin/sh\necho "head: illegal line count -- -1" >&2\nexit 1\n' > "$TOOLS_DIR/head"
chmod +x "$TOOLS_DIR/head"
expect_output "names head when it is not GNU head" \
    "❌ GNU head is required to prune old frontend assets" \
    "$(PATH="$TOOLS_DIR" require_retention_tools 2>&1)"

echo
if [ "$FAILURES" -gt 0 ]; then
    echo "$FAILURES failure(s)"
    exit 1
fi
echo "all passed"
