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
# exists to prevent.
# A subshell, so the scratch directory's cleanup trap ends with it.
prune_frontend_assets() (
    local bucket="$1" keep="$2" work
    work=$(mktemp -d)
    trap 'rm -rf "$work"' EXIT

    list_keys "$bucket" "$FRONTEND_MANIFEST_PREFIX" | sort > "$work/manifests"
    local count
    count=$(wc -l < "$work/manifests")
    if [ "$count" -lt "$keep" ]; then
        echo "   $count of $keep builds recorded; keeping every asset for now"
        return 0
    fi

    tail -n "$keep" "$work/manifests" | while read -r key; do
        aws s3 cp "s3://$bucket/$key" - --only-show-errors
    done | sort -u > "$work/keep"

    list_keys "$bucket" assets/ > "$work/assets"
    stale_assets "$work/keep" < "$work/assets" > "$work/stale" || return 1
    echo "   Deleting $(wc -l < "$work/stale") asset(s) no recent build uses"
    delete_keys "$bucket" < "$work/stale"
    stale_manifests "$keep" < "$work/manifests" | delete_keys "$bucket"
)
