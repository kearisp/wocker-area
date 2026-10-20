#!/usr/bin/env bash
# Creates a Canny changelog entry from GitHub release notes.
#
# Required env: CANNY_API_KEY, ENTRY_TITLE, and RELEASE_BODY or BODY_FILE
# Optional env: LABELS (comma-separated names), PUBLISHED (default false), NOTIFY (default false)
# DRY_RUN=1 still reads entries/list, but prints the create payload instead of sending it.
#
# Local example:
#   gh release view v1.1.7 --repo kearisp/wocker-ws --json body -q .body > /tmp/body.md
#   CANNY_API_KEY=... ENTRY_TITLE=v1.1.7 BODY_FILE=/tmp/body.md LABELS=wocker DRY_RUN=1 ./canny-changelog.sh

set -euo pipefail

: "${LABELS:=}"
: "${PUBLISHED:=false}"
: "${NOTIFY:=false}"
: "${DRY_RUN:=0}"

if [ -z "${CANNY_API_KEY:-}" ]; then
    echo "❌ CANNY_API_KEY is empty"
    exit 1
fi

if [ -z "${ENTRY_TITLE:-}" ]; then
    echo "❌ ENTRY_TITLE is empty"
    exit 1
fi

if [ -z "${RELEASE_BODY:-}" ] && [ -n "${BODY_FILE:-}" ]; then
    RELEASE_BODY=$(cat "$BODY_FILE")
fi

if [ -z "${RELEASE_BODY:-}" ]; then
    echo "❌ RELEASE_BODY is empty"
    exit 1
fi

BODY=$(printf '%s\n' "$RELEASE_BODY" | tr -d '\r')

# Canny changelog expects top-level headings, GitHub releases use ###
DETAILS=$(printf '%s\n' "$BODY" | awk '
    /^(```|~~~)/ { fence = !fence }
    !fence && /^### / { sub(/^### /, "# ") }
    { print }
')

HEADINGS=$(printf '%s\n' "$BODY" | grep -c '^### ' || true)
if printf '%s\n' "$BODY" | grep -qi '^### Features'; then
    TYPE=new
elif [ "$HEADINGS" -eq 1 ] && printf '%s\n' "$BODY" | grep -qi '^### Fixes'; then
    TYPE=fixed
else
    TYPE=improved
fi

EXISTING=$(curl -sS --fail-with-body -X POST https://canny.io/api/v1/entries/list \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg key "$CANNY_API_KEY" '{apiKey: $key, limit: 100, sort: "created"}')")

if printf '%s' "$EXISTING" | jq -e --arg t "$ENTRY_TITLE" 'any(.entries[]?; .title == $t)' > /dev/null; then
    echo "Entry \"$ENTRY_TITLE\" already exists, skipping"
    exit 0
fi

# Canny has no endpoint to list labels, so IDs are taken from labels of existing entries
LABEL_IDS=$(printf '%s' "$EXISTING" | jq -r --arg labels "$LABELS" '
    [.entries[]?.labels[]?] | unique_by(.id) as $known
    | ($labels | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))) as $names
    | $names[] as $n
    | ($known | map(select(.name | ascii_downcase == ($n | ascii_downcase))) | first) as $found
    | if $found then $found.id else empty end
' | paste -sd, -)

MISSING=$(printf '%s' "$EXISTING" | jq -r --arg labels "$LABELS" '
    [.entries[]?.labels[]?.name | ascii_downcase] as $known
    | $labels | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0 and ((ascii_downcase) as $l | $known | index($l) | not)))
    | join(", ")
')

if [ -n "$MISSING" ]; then
    echo "::warning::Canny labels not found in the last 100 entries, skipped: $MISSING"
fi

PAYLOAD=$(jq -n \
    --arg key "$CANNY_API_KEY" \
    --arg title "$ENTRY_TITLE" \
    --arg details "$DETAILS" \
    --arg type "$TYPE" \
    --arg labels "$LABEL_IDS" \
    --argjson published "$PUBLISHED" \
    --argjson notify "$NOTIFY" \
    '{
        apiKey: $key,
        title: $title,
        details: $details,
        type: $type,
        published: $published,
        notify: $notify
    } + (
        ($labels | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))) as $ids
        | if ($ids | length) > 0 then {labelIDs: $ids} else {} end
    )')

if [ "$DRY_RUN" = "1" ]; then
    echo "DRY RUN, payload that would be sent:"
    printf '%s' "$PAYLOAD" | jq '.apiKey = "***"'
    exit 0
fi

RESPONSE=$(curl -sS --fail-with-body -X POST https://canny.io/api/v1/entries/create \
    -H 'Content-Type: application/json' \
    -d "$PAYLOAD")

echo "Created Canny entry \"$ENTRY_TITLE\" ($TYPE, published=$PUBLISHED): $(printf '%s' "$RESPONSE" | jq -r '.id')"