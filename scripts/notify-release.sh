#!/bin/bash

# Script to notify Discord of changelog changes between two commits
# Usage: ./notify-release.sh <from_commit> <to_commit> <discord_webhook_url>

set -e

if [ $# -ne 3 ]; then
    echo "Usage: $0 <from_commit> <to_commit> <discord_webhook_url>"
    echo "Example: $0 HEAD~5 HEAD https://discord.com/api/webhooks/..."
    exit 1
fi

FROM_COMMIT="$1"
TO_COMMIT="$2"
WEBHOOK_URL="$3"

# Get repository name for the notification
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")

# Function to extract new changelog entries from diff
extract_changelog_changes() {
    local file="$1"
    local changes=""
    
    # Get the diff for the changelog file
    if git diff --name-only "$FROM_COMMIT" "$TO_COMMIT" | grep -q "$file"; then
        # Extract only the added lines (starting with +) that aren't metadata
        changes=$(git diff "$FROM_COMMIT" "$TO_COMMIT" -- "$file" | grep "^+" | grep -v "^+++" | sed 's/^+//' | grep -E "(^### |^- |^## \[)" | head -20)
    fi
    
    echo "$changes"
}

# Function to format changes for Discord
format_for_discord() {
    local title="$1"
    local changes="$2"
    local formatted=""
    
    if [ -n "$changes" ]; then
        formatted="**$title**"$'\n'
        # Convert to Discord markdown format with proper formatting
        formatted="$formatted$(echo "$changes" | \
            sed 's/^## \[/\n🏷️ **Version [/' | \
            sed 's/\] - /]** - /' | \
            sed 's/^### /### /' | \
            sed 's/^- /  - /')"$'\n'
    fi
    
    echo "$formatted"
}

# Extract changes from each changelog
ROOT_CHANGES=$(extract_changelog_changes "CHANGELOG.md")
BACKEND_CHANGES=$(extract_changelog_changes "apps/backend/CHANGELOG.md")
FRONTEND_CHANGES=$(extract_changelog_changes "apps/frontend/CHANGELOG.md")

# Build the Discord message
MESSAGE="🚀 **Release Update for $REPO_NAME**"$'\n\n'

# Add changes if they exist
if [ -n "$ROOT_CHANGES" ]; then
    MESSAGE="$MESSAGE$(format_for_discord "📦 Repository Changes" "$ROOT_CHANGES")"$'\n'
fi

if [ -n "$BACKEND_CHANGES" ]; then
    MESSAGE="$MESSAGE$(format_for_discord "⚙️ Backend Changes" "$BACKEND_CHANGES")"$'\n'
fi

if [ -n "$FRONTEND_CHANGES" ]; then
    MESSAGE="$MESSAGE$(format_for_discord "🎨 Frontend Changes" "$FRONTEND_CHANGES")"$'\n'
fi

# If no changes found, create a generic message
if [ -z "$ROOT_CHANGES" ] && [ -z "$BACKEND_CHANGES" ] && [ -z "$FRONTEND_CHANGES" ]; then
    MESSAGE="${MESSAGE}📝 Changelog updates detected between commits \`$FROM_COMMIT\` and \`$TO_COMMIT\`"$'\n\n'"No specific changelog entries were found in the diff."
fi

# Add commit range info at the bottom
MESSAGE="${MESSAGE}"$'\n'"---"$'\n'"📋 **Commit Range:** \`$FROM_COMMIT\` → \`$TO_COMMIT\`"

# Send to Discord webhook using jq for safe JSON encoding
PAYLOAD=$(echo "$MESSAGE" | jq -Rs '{content: .}')

echo "Sending payload to Discord:"
echo "$PAYLOAD"

curl -H "Content-Type: application/json" \
     -X POST \
     -d "$PAYLOAD" \
     "$WEBHOOK_URL"

echo "✅ Release notification sent to Discord!"