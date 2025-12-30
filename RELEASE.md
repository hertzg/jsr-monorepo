# Release Process

This document describes how to release new versions of packages in this
monorepo.

## Overview

Releases are fully automated through GitHub Actions. The `scripts/release.sh`
script orchestrates the entire process.

## Commit Message Format

Releases are driven by commit messages using
[Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

### Types

| Type    | Version Bump | Description           |
| ------- | ------------ | --------------------- |
| `feat`  | Minor        | New feature           |
| `fix`   | Patch        | Bug fix               |
| `chore` | None         | Maintenance (no bump) |

### Scopes

Scopes must exactly match the package `name` in each workspace's `deno.json`:

- `@hertzg/binstruct`
- `@hertzg/bx`
- `@hertzg/ip`
- `@hertzg/mymagti-api`
- `@hertzg/routeros-api`
- `@hertzg/tplink-api`
- `@hertzg/wg-conf`
- `@hertzg/wg-ini`
- `@hertzg/wg-keys`
- `@binstruct/cli`
- `@binstruct/ethernet`
- `@binstruct/png`
- `@binstruct/wav`

### Examples

```bash
# Minor version bump for @hertzg/binstruct
feat(@hertzg/binstruct): add new array coder

# Patch version bump for @binstruct/png
fix(@binstruct/png): fix CRC calculation

# No version bump
chore(@hertzg/bx): update documentation
```

## Releasing

### Using the Release Script (Recommended)

The easiest way to release is using the automated script:

```bash
./scripts/release.sh
```

This script performs all 9 steps automatically:

1. **Pre-flight checks** - Runs tests, linting, and format checks locally
2. **Push and wait for CI** - Pushes to origin and waits for CI checks to pass
3. **Trigger version_bump** - Triggers the version_bump GitHub workflow
4. **Wait for PR** - Waits for the version bump PR to be created
5. **Note branch name** - Captures the release branch name for tagging
6. **Merge PR** - Waits for PR checks then merges with squash
7. **Create tag** - Creates and pushes a git tag on main
8. **Create release** - Creates a GitHub release with changelog
9. **Monitor publish** - Watches the workspace_publish workflow

### Manual Steps (If Script Fails)

If the script fails mid-way, you can complete the remaining steps manually:

1. **Trigger version bump**: Actions → version_bump → Run workflow
2. **Merge the PR**: Review and merge the version bump PR
3. **Create release**: Releases → Create new release → Select/create tag →
   Publish

Creating a GitHub release triggers the `workspace_publish` workflow which
publishes all packages to JSR.

## Troubleshooting

### CI Fails on Commit Scope

If CI fails due to invalid commit scope:

1. The scope must exactly match a package name
2. Check for typos (e.g., `binstruct` vs `@hertzg/binstruct`)
3. Recovery requires rebasing and rewording commits

### Version Not Bumped

If a package version wasn't bumped:

1. Verify commit type is `feat` or `fix` (not `chore`)
2. Verify scope exactly matches the package name
3. Check if the commit was included in the version bump range

### Release Script Timeout

The script has a 10-minute timeout for CI checks. If your CI takes longer:

1. Wait for CI to complete manually
2. Continue with manual steps from where the script stopped
