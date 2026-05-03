# ADR 0003 — Release Please for monorepo releases

**Status:** Accepted

## Context

Initially the repo used a custom `version_bump` GitHub Action plus a
`release.sh` script that parsed conventional commits to bump versions and tag
releases. Maintaining custom release tooling for ~22 packages was brittle and
required workspace-specific glue, and it conflated two responsibilities:
deciding what to release, and producing the release artifacts.

## Decision

Use [release-please](https://github.com/googleapis/release-please-action) to
manage versioning, changelog generation, and release PRs across all
workspaces.

- **Routing is path-based:** release-please determines which packages a commit
  affects from the file paths it touched, configured via
  `release-please-config.json`. The commit's `scope` string is not used for
  routing (see ADR 0002).
- **Bump level is type-based:** `feat` → minor, `fix` → patch, `!` /
  `BREAKING CHANGE:` → major (see ADR 0004).

## Consequences

- The custom `deno task bump` and `release.sh` were removed.
- Release PRs are auto-generated and merged like any other PR.
- Adding a new workspace requires registering it in
  `release-please-config.json`.
- Pre-1.0 bumps follow release-please defaults — for forced 1.0 bumps, use a
  `Release-As: 1.0.0` footer.
- Multi-package commits produce correct per-package release entries
  automatically because routing is by path.

## References

- `release-please-config.json`
- AGENTS.md "Commit Message Rules"
- ADR 0002 — Conventional Commits with free-form scopes
- ADR 0004 — Breaking changes use `!` plus `BREAKING CHANGE:` footer
