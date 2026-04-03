# Release Process

This document describes how releases work in this monorepo.

## Overview

Releases are automated via
[Release Please](https://github.com/googleapis/release-please). On every push
to `main`, Release Please analyzes commits and maintains a release PR with
version bumps and changelogs for affected packages.

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

### How Packages Are Identified

Release Please uses **file paths** to determine which packages are affected by a
commit. A commit touching files in `packages/ip/` will bump `@hertzg/ip`,
regardless of the commit scope. Scopes are still used for changelog formatting.

## Releasing

1. Merge feature/fix commits to `main` using Conventional Commits
2. Release Please automatically creates/updates a release PR with:
   - Version bumps in each affected package's `deno.json`
   - Updated `import_map.json` (synced automatically)
   - Per-package `CHANGELOG.md` entries
3. When ready to release, merge the release PR
4. Release Please creates per-package GitHub Releases with tags
5. `deno publish` runs automatically, publishing all packages to JSR

## Configuration

- `release-please-config.json` — package definitions and release types
- `.release-please-manifest.json` — current version tracking

## Troubleshooting

### Version Not Bumped

If a package version wasn't bumped:

1. Verify commit type is `feat` or `fix` (not `chore`)
2. Verify the commit touches files within the package's directory
3. Check the release PR for the package's changelog entry

### import_map.json Out of Sync

The release workflow automatically syncs `import_map.json` after version bumps.
If it gets out of sync locally, run:

```bash
deno run -A _tools/sync_import_map.ts
```
