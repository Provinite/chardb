#!/bin/bash
#
# Self-checking test for scripts/lib/mask-in-actions.sh.
#
#   ./scripts/lib/mask-in-actions.test.sh
#
# NOT run by CI. The repository has no shell test harness -- no bats, no
# shellcheck step, no actionlint -- and adding one for a single file was more
# than #378 called for. Run it by hand when touching the helper.
#
# Every fixture below is fake. The values are shaped like the real ones so the
# assertions mean something, but none of them names anything that exists: the
# addresses come from the RFC 5737 documentation range, and the account id,
# instance id and distribution id are placeholders. This file is committed to a
# public repository, which is the same reason the helper exists at all.

set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
source ./scripts/lib/mask-in-actions.sh

FAILURES=0

# Compare actual against expected, reporting the difference rather than just
# "failed" -- a mask test that fails silently is worse than no test.
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

SERVER_IP="203.0.113.10"
INSTANCE_ID="i-0example000000000"
ECR_REPOSITORY_URL="000000000000.dkr.ecr.us-east-1.amazonaws.com/example-backend"
EMPTY_VALUE=""

echo "mask-in-actions"

expect_output "masks each named variable, one directive per value" \
    "::add-mask::203.0.113.10
::add-mask::i-0example000000000" \
    "$(GITHUB_ACTIONS=true mask_in_actions SERVER_IP INSTANCE_ID)"

expect_output "emits nothing outside Actions, so local runs are unchanged" \
    "" \
    "$(GITHUB_ACTIONS="" mask_in_actions SERVER_IP INSTANCE_ID)"

expect_output "emits nothing when GITHUB_ACTIONS is unset entirely" \
    "" \
    "$(unset GITHUB_ACTIONS; mask_in_actions SERVER_IP)"

# An empty value would mask nothing and Actions rejects the directive; the
# missing-outputs branch in deploy.sh depends on empty variables still printing.
expect_output "skips empty variables rather than emitting a bare directive" \
    "::add-mask::203.0.113.10" \
    "$(GITHUB_ACTIONS=true mask_in_actions EMPTY_VALUE SERVER_IP)"

expect_output "skips variables that do not exist at all" \
    "" \
    "$(GITHUB_ACTIONS=true mask_in_actions NOT_A_REAL_VARIABLE_NAME)"

expect_output "masks a value containing slashes and dots unaltered" \
    "::add-mask::000000000000.dkr.ecr.us-east-1.amazonaws.com/example-backend" \
    "$(GITHUB_ACTIONS=true mask_in_actions ECR_REPOSITORY_URL)"

expect_output "accepts no arguments without erroring" \
    "" \
    "$(GITHUB_ACTIONS=true mask_in_actions)"

echo
if [ "$FAILURES" -eq 0 ]; then
    echo "✅ all checks passed"
    exit 0
fi

echo "❌ $FAILURES check(s) failed"
exit 1
