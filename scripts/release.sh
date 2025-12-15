#!/usr/bin/env bash

# Automated Release Script for JSR Monorepo
# This script automates the entire release process for packages mentioned in commits

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_WAIT_TIME=600  # 10 minutes max wait for checks
POLL_INTERVAL=10   # Poll every 10 seconds

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

wait_with_spinner() {
  local pid=$1
  local message=$2
  local spinner=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  local i=0

  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${BLUE}${spinner[$i]}${NC} $message"
    i=$(((i + 1) % ${#spinner[@]}))
    sleep 0.1
  done
  printf "\r"
}

# Step 1: Pre-flight checks
log_info "Step 1/9: Running pre-flight checks..."

# Run tests
log_info "Running tests..."
if ! deno task test > /tmp/release_test.log 2>&1; then
  log_error "Tests failed! See /tmp/release_test.log"
  exit 1
fi
log_success "Tests passed"

# Run lint
log_info "Running linter..."
if ! deno task lint > /tmp/release_lint.log 2>&1; then
  log_error "Linting failed! See /tmp/release_lint.log"
  exit 1
fi
log_success "Linting passed"

# Check formatting
log_info "Checking formatting..."
if ! deno fmt --check > /tmp/release_fmt.log 2>&1; then
  log_error "Formatting check failed! Run: deno fmt"
  exit 1
fi
log_success "Formatting check passed"

log_success "All pre-flight checks passed"

# Step 2: Push and wait for CI
log_info "Step 2/9: Pushing to origin and waiting for CI..."

CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse HEAD)

log_info "Pushing branch '$CURRENT_BRANCH' to origin..."
git push

log_info "Waiting for CI checks to start..."
sleep 5

# Wait for CI checks
log_info "Waiting for CI checks to complete..."
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
  CHECK_STATUS=$(gh api "repos/:owner/:repo/commits/$CURRENT_COMMIT/check-runs" --jq '.check_runs | map(select(.status == "completed")) | length')
  TOTAL_CHECKS=$(gh api "repos/:owner/:repo/commits/$CURRENT_COMMIT/check-runs" --jq '.check_runs | length')

  if [ "$TOTAL_CHECKS" -gt 0 ] && [ "$CHECK_STATUS" -eq "$TOTAL_CHECKS" ]; then
    # All checks completed, verify they passed
    FAILED_CHECKS=$(gh api "repos/:owner/:repo/commits/$CURRENT_COMMIT/check-runs" --jq '.check_runs | map(select(.conclusion != "success")) | length')
    if [ "$FAILED_CHECKS" -gt 0 ]; then
      log_error "CI checks failed!"
      exit 1
    fi
    log_success "All CI checks passed"
    break
  fi

  printf "\r${BLUE}⏳${NC} CI checks in progress ($CHECK_STATUS/$TOTAL_CHECKS completed)..."
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done
echo ""

if [ $ELAPSED -ge $MAX_WAIT_TIME ]; then
  log_error "Timeout waiting for CI checks"
  exit 1
fi

# Step 3: Trigger version_bump workflow
log_info "Step 3/9: Triggering version_bump workflow..."

# Find the workflow file
WORKFLOW_FILE=$(gh api repos/:owner/:repo/actions/workflows --jq '.workflows[] | select(.name | contains("version") or contains("bump")) | .path' | head -n1)

if [ -z "$WORKFLOW_FILE" ]; then
  log_error "Could not find version_bump workflow"
  exit 1
fi

log_info "Triggering workflow: $WORKFLOW_FILE"
gh workflow run "$WORKFLOW_FILE"

log_success "Workflow triggered"

# Step 4: Wait for PR creation and note branch name
log_info "Step 4/9: Waiting for PR creation..."

log_info "Waiting for version bump PR to be created..."
PR_NUMBER=""
BRANCH_NAME=""
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
  # Look for recent PRs with "release" or "version" in title, including drafts
  PR_DATA=$(gh pr list --json number,title,headRefName,isDraft --limit 5 --jq '.[] | select(.title | test("release|version|bump"; "i"))')

  if [ -n "$PR_DATA" ]; then
    PR_NUMBER=$(echo "$PR_DATA" | jq -r '.number' | head -n1)
    BRANCH_NAME=$(echo "$PR_DATA" | jq -r '.headRefName' | head -n1)
    IS_DRAFT=$(echo "$PR_DATA" | jq -r '.isDraft' | head -n1)

    if [ -n "$PR_NUMBER" ] && [ -n "$BRANCH_NAME" ]; then
      if [ "$IS_DRAFT" = "true" ]; then
        log_success "PR created: #$PR_NUMBER (branch: $BRANCH_NAME) [DRAFT]"
      else
        log_success "PR created: #$PR_NUMBER (branch: $BRANCH_NAME)"
      fi
      break
    fi
  fi

  printf "\r${BLUE}⏳${NC} Waiting for PR creation..."
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done
echo ""

if [ -z "$PR_NUMBER" ]; then
  log_error "Timeout waiting for PR creation"
  exit 1
fi

# Save branch name for later
echo "$BRANCH_NAME" > /tmp/release_branch_name.txt

# Step 5: Note the branch name (already done in step 4)
log_success "Step 5/9: Branch name noted: $BRANCH_NAME"

# Step 6: Wait for checks and merge PR
log_info "Step 6/9: Waiting for PR checks and merging..."

# Check if PR is draft and mark as ready if needed
PR_INFO=$(gh pr view "$PR_NUMBER" --json isDraft,state)
IS_DRAFT_NOW=$(echo "$PR_INFO" | jq -r '.isDraft')
PR_STATE=$(echo "$PR_INFO" | jq -r '.state')

if [ "$IS_DRAFT_NOW" = "true" ]; then
  log_info "PR is in draft state, marking as ready for review..."
  gh pr ready "$PR_NUMBER"
  log_success "PR marked as ready for review"
fi

log_info "Waiting for PR #$PR_NUMBER checks to pass..."
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
  # Check PR status
  PR_STATUS=$(gh pr view "$PR_NUMBER" --json statusCheckRollup --jq '.statusCheckRollup[]' 2>/dev/null || echo "")

  if [ -z "$PR_STATUS" ]; then
    log_info "No checks yet, waiting..."
  else
    PENDING_CHECKS=$(echo "$PR_STATUS" | jq 'select(.status == "PENDING" or .status == "IN_PROGRESS")' | wc -l)
    FAILED_CHECKS=$(echo "$PR_STATUS" | jq 'select(.conclusion == "FAILURE")' | wc -l)

    if [ "$FAILED_CHECKS" -gt 0 ]; then
      log_error "PR checks failed!"
      exit 1
    fi

    if [ "$PENDING_CHECKS" -eq 0 ]; then
      log_success "All PR checks passed"
      break
    fi

    printf "\r${BLUE}⏳${NC} PR checks in progress..."
  fi

  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done
echo ""

if [ $ELAPSED -ge $MAX_WAIT_TIME ]; then
  log_error "Timeout waiting for PR checks"
  exit 1
fi

# Merge the PR
log_info "Merging PR #$PR_NUMBER..."
gh pr merge "$PR_NUMBER" --squash --delete-branch
log_success "PR merged and branch deleted"

# Step 7: Create tag on main
log_info "Step 7/9: Creating and pushing tag..."

log_info "Pulling latest changes from main..."
git checkout main
git pull origin main

log_info "Creating tag: $BRANCH_NAME"
git tag "$BRANCH_NAME"

log_info "Pushing tag to origin..."
git push origin "$BRANCH_NAME"

log_success "Tag $BRANCH_NAME created and pushed"

# Step 8: Create GitHub release with changelog
log_info "Step 8/9: Creating GitHub release..."

# Generate changelog (get commits since last tag)
LAST_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  CHANGELOG=$(git log --pretty=format:"- %s (%h)" --no-merges)
else
  CHANGELOG=$(git log "$LAST_TAG..HEAD" --pretty=format:"- %s (%h)" --no-merges)
fi

# Create release
log_info "Creating release for tag: $BRANCH_NAME"
gh release create "$BRANCH_NAME" \
  --title "Release $BRANCH_NAME" \
  --notes "## Changes

$CHANGELOG

---
This release was automatically created by the release script."

log_success "GitHub release created"

# Step 9: Wait for and verify release workflow
log_info "Step 9/9: Monitoring release workflow..."

log_info "Waiting for workspace_publish workflow to start..."
sleep 10

# Find the workspace_publish workflow run
WORKFLOW_RUN=$(gh run list --workflow="workspace publish" --limit 1 --json databaseId,status --jq '.[0]')
RUN_ID=$(echo "$WORKFLOW_RUN" | jq -r '.databaseId')

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  log_warning "Could not find workspace_publish workflow run"
else
  log_info "Monitoring workflow run #$RUN_ID..."

  # Watch the workflow
  gh run watch "$RUN_ID" --exit-status

  log_success "Release workflow completed successfully"
fi

# Final summary
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   🎉 Release Process Complete! 🎉     ║"
echo "╚════════════════════════════════════════╝"
echo ""
log_success "Tag: $BRANCH_NAME"
log_success "Release: https://github.com/$(gh repo view --json owner,name --jq '.owner.login + \"/\" + .name')/releases/tag/$BRANCH_NAME"
log_info "The package(s) should now be published to JSR"
echo ""
