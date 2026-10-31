#!/bin/bash
#
# Keeps the last few production builds' assets in the frontend bucket.
#
# A tab opened before a deploy still runs the old build, and fetches that
# build's page chunks by name as it navigates. Deleting them on deploy breaks
# its next navigation. Asset names are content hashes, so keeping old ones
# beside new ones is always safe; each deploy records the names it uploaded in
# a manifest under deploys/, and only assets no recent manifest names are
# deleted.
#
#   source scripts/lib/frontend-asset-retention.sh
#   record_frontend_assets "$BUCKET" apps/frontend/dist
#   prune_frontend_assets "$BUCKET" 5
#
# Needs the AWS CLI and jq.

FRONTEND_MANIFEST_PREFIX="deploys/"

# Fails unless the tools pruning needs are here: bash 4 for `mapfile`, jq, and
# GNU head for `head -n -N` (macOS ships bash 3 and BSD head). Call it before
# the deploy uploads anything, so a missing tool stops the deploy rather than
# leaving it half done.
require_retention_tools() {
    if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
        echo "❌ bash 4 or later is required to prune old frontend assets" >&2
        return 1
    fi
    if ! command -v jq > /dev/null 2>&1; then
        echo "❌ jq is required to prune old frontend assets" >&2
        return 1
    fi
    if [ "$(printf 'a\nb\n' | head -n -1 2> /dev/null)" != "a" ]; then
        echo "❌ GNU head is required to prune old frontend assets" >&2
        return 1
    fi
}

# Reads manifest keys on stdin; prints every one but the newest $1. Keys are
# UTC timestamps, so name order is age order.
stale_manifests() {
    local keep="$1"
    sort | head -n "-$keep"
}

# Reads asset keys on stdin; prints those not listed, as whole lines, in the
# file $1. An empty keep list would make everything stale, which is never
# right, so it fails instead.
stale_assets() {
    local keep_file="$1"
    if [ ! -s "$keep_file" ]; then
        echo "❌ No assets to keep; refusing to prune" >&2
        return 1
    fi
    grep -vxF -f "$keep_file" || true
}

# Prints the keys in file $1 (to be deleted) that file $2 (the build being
# deployed) still uses. Anything printed means the keep list is wrong.
still_in_use() {
    grep -xF -f "$2" "$1" || true
}

# Lists the keys under prefix $2 in bucket $1, one per line.
list_keys() {
    aws s3api list-objects-v2 --bucket "$1" --prefix "$2" \
        --query 'Contents[].Key' --output text \
        | tr '\t' '\n' | grep -v -e '^None$' -e '^$' || true
}

# Deletes the keys read on stdin from bucket $1, a thousand per request.
delete_keys() {
    local bucket="$1" batch
    while mapfile -t -n 1000 batch && [ "${#batch[@]}" -gt 0 ]; do
        printf '%s\n' "${batch[@]}" \
            | jq -R '{Key: .}' | jq -s '{Objects: ., Quiet: true}' \
            | aws s3api delete-objects --bucket "$bucket" --delete file:///dev/stdin \
            > /dev/null
    done
}

# Uploads a manifest of the assets in build directory $2 to bucket $1. Call it
# before the build's index.html goes up, so no live index.html is ever missing
# from the record.
record_frontend_assets() {
    local bucket="$1" dist="$2"
    local key="${FRONTEND_MANIFEST_PREFIX}$(date -u +%Y%m%dT%H%M%SZ).txt"
    (cd "$dist" && find assets -type f | sort) \
        | aws s3 cp - "s3://$bucket/$key" --only-show-errors \
            --content-type text/plain --cache-control no-store
}

# Deletes the assets no newest-$2 manifest names, and the older manifests.
# Does nothing until $2 manifests exist: assets uploaded before the first
# manifest are named by none, and deleting them early is the breakage this
# exists to prevent. $3 is the build directory just deployed: if any of its
# assets would be deleted, the keep list is wrong and nothing is deleted.
# A subshell, so the scratch directory's cleanup trap and `set -o pipefail`
# end with it.
prune_frontend_assets() (
    set -eo pipefail
    local bucket="$1" keep="$2" dist="$3" work key
    work=$(mktemp -d)
    trap 'rm -rf "$work"' EXIT

    list_keys "$bucket" "$FRONTEND_MANIFEST_PREFIX" | sort > "$work/manifests"
    local count
    count=$(wc -l < "$work/manifests")
    if [ "$count" -lt "$keep" ]; then
        echo "   $count of $keep builds recorded; keeping every asset for now"
        return 0
    fi

    # One download at a time, outside a pipeline, so a failed one stops the
    # prune instead of quietly shortening the keep list.
    : > "$work/keep"
    for key in $(tail -n "$keep" "$work/manifests"); do
        if ! aws s3 cp "s3://$bucket/$key" - --only-show-errors >> "$work/keep"; then
            echo "❌ Could not read a build manifest; deleting nothing" >&2
            return 1
        fi
    done
    sort -u -o "$work/keep" "$work/keep"

    list_keys "$bucket" assets/ > "$work/assets"
    stale_assets "$work/keep" < "$work/assets" > "$work/stale"

    (cd "$dist" && find assets -type f | sort) > "$work/current"
    if [ -n "$(still_in_use "$work/stale" "$work/current")" ]; then
        echo "❌ The keep list misses assets this build uses; deleting nothing" >&2
        return 1
    fi

    echo "   Deleting $(wc -l < "$work/stale") asset(s) no recent build uses"
    delete_keys "$bucket" < "$work/stale"
    stale_manifests "$keep" < "$work/manifests" | delete_keys "$bucket"
)
