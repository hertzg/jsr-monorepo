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
   - Version bumps in each affected package's `package.json`
   - Per-package `CHANGELOG.md` entries
3. When ready to release, merge the release PR
4. Release Please creates per-package GitHub Releases with tags
5. The same workflow run publishes every package to JSR and to npm

`package.json` is the only place a version lives. A sibling dependency is
written `workspace:^`, so it follows the sibling's version without a sync step.

## What Gets Published

Both registries ship the same modules: the ones the `files` list in a
package's `package.json` selects.

| Registry | Contents                           | Built by              | Published by      |
| -------- | ---------------------------------- | --------------------- | ----------------- |
| JSR      | TypeScript source                  | `_tools/build_jsr.ts` | `bun x jsr publish` |
| npm      | `.js` + `.d.ts`, bundled `@std/*`  | `_tools/build_npm.ts` | `npm publish <tarball> --provenance` |

- `_tools/build_jsr.ts` writes a `jsr.json` beside each `package.json`. It is
  generated and ignored by git. Never edit or commit one.
- `_tools/build_npm.ts` writes `dist/<scope>/<name>/`. A dependency written as
  `npm:@jsr/...` (every `@std/*` package) is copied into the tarball as a
  bundled dependency, because a consumer installing from the npm registry
  cannot reach npm.jsr.io.
- Never run `bun publish` or `npm publish` inside `packages/`. That would ship
  TypeScript source with unresolvable dependencies. Only `dist/` is publishable.
- Both publishes skip versions that already exist, so re-running a failed
  release job is safe.

Both registries authenticate the workflow through OIDC. No publish token is
stored, apart from `NPM_TOKEN` while a package is published for the first time
(npm only lets a trusted publisher be configured on a package that exists).

## Checking a Release Locally

```bash
bun _tools/build_jsr.ts && bun x jsr publish --dry-run   # add --allow-dirty with uncommitted changes
bun _tools/build_npm.ts && bun _tools/verify_npm.ts
```

`verify_npm.ts` packs every built package, installs each tarball into a
throwaway project with `bun` and with `npm`, imports every `exports` entry
under `bun` and `node`, and type-checks them. CI runs both lines on every PR.

## Configuration

- `release-please-config.json` — package definitions and release types
- `.release-please-manifest.json` — current version tracking

## Troubleshooting

### Version Not Bumped

If a package version wasn't bumped:

1. Verify commit type is `feat` or `fix` (not `chore`)
2. Verify the commit touches files within the package's directory
3. Check the release PR for the package's changelog entry

### A Dependency Bump Was Not Released

A dependency range lives in the `package.json` of the package that uses it, so
a bump is a change inside that package's directory. It still needs a `fix` or
`feat` commit to produce a release: a `chore` commit bumps nothing.
