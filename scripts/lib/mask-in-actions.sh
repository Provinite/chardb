#!/bin/bash
#
# Keep infrastructure identifiers out of public workflow logs.
#
# Sourced, not executed:
#
#   source scripts/lib/mask-in-actions.sh
#   mask_in_actions SERVER_IP INSTANCE_ID ECR_REPOSITORY_URL
#
# This repository is public, so every Actions log is world-readable. The values
# the deploy path handles -- the host's Elastic IP, its instance id, the ECR
# repository URL, the SQS queue URL, the CloudFront distribution id -- are not
# credentials, and knowing them does not by itself let anyone in. The objection
# is narrower: a permanent public log should not double as an inventory of what
# is deployed and where (#378).
#
# `::add-mask::` is used rather than deleting the lines that print these,
# because deleting only covers the call sites somebody thought of. Tools in the
# deploy path print these values on their own account -- `docker push` names the
# registry it is pushing to, `aws cloudfront create-invalidation` echoes the
# distribution id back in its reply, a failing `curl` prints the URL it could
# not reach -- and the next script added to the path would start leaking again
# by default. A mask covers all of that, including values appearing inside
# longer strings, and it keeps covering it without anyone maintaining a list.
#
# The deliberate echoes are still removed where they carry nothing once masked;
# the two mechanisms are complementary rather than alternatives.
#
# TWO PROPERTIES OF `::add-mask::` THAT SHAPE HOW THIS IS CALLED
#
#   1. It only redacts lines printed AFTER it. So masking has to happen between
#      a value becoming known and anything printing it -- in practice, straight
#      after `_tf_outputs_load` returns, before the summary it feeds.
#   2. It does not cross job boundaries. `ci.yml` and `release.yml` have four
#      deploy jobs between them, each loading these values separately, so the
#      mask belongs in the scripts they all call rather than in a workflow step
#      that would need four copies.
#
# WHAT IS DELIBERATELY NOT MASKED
#
# A masked value is redacted everywhere it appears, including as a substring of
# something else, so masking a short or word-shaped value shreds unrelated log
# text -- and can hide the error you opened the log to read. The site's domains
# (`ROOT_DOMAIN`, the frontend and prod API URLs) and the OAuth callback URLs
# are therefore left alone: every visitor's browser already knows them, and
# `chardb.cc` occurs in far too much log text to redact for nothing.

# Emit an `::add-mask::` for the value of each named variable.
#
# Takes NAMES rather than values so call sites read as a plain list instead of a
# wall of quoting. Empty variables are skipped: masking an empty string means
# nothing, and the missing-outputs diagnostics in `deploy.sh` exist precisely to
# print variables that are unset.
#
# Outside Actions this is a no-op, so a developer running the same scripts by
# hand sees the real values exactly as before.
#
# Both expansions carry a `-` default so the function survives `set -u`. Without
# it, a caller running with `nounset` aborts here on an unset GITHUB_ACTIONS or
# on any name that happens not to be set -- which would turn a log-hygiene
# helper into something that can fail a deploy.
mask_in_actions() {
    [ -n "${GITHUB_ACTIONS:-}" ] || return 0

    local name value
    for name in "$@"; do
        value="${!name:-}"
        [ -n "$value" ] || continue
        echo "::add-mask::$value"
    done
}
