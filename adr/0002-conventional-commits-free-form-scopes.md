# ADR 0002 — Conventional Commits with free-form scopes

**Status:** Accepted

## Context

The monorepo publishes ~22 packages independently to JSR. Releases are driven
by Release Please (see ADR 0003), which needs to encode change type in commit
messages to determine version bump levels. Earlier in the repo's life, scopes
were required to match package names exactly, with CI failing on mismatches —
this turned out to be unnecessary friction once Release Please was wired up to
route changes by file path instead of by scope string.

## Decision

Every commit follows `type(scope): summary` with type ∈ `{feat, fix, chore}`.

Scope is mandatory but **free-form** — it is a human-readable hint for
changelog readability, not a routing key. Release Please determines which
packages are affected from the changed file paths (see ADR 0003), not from
the scope.

Use scopes that read well in changelogs: package names, area names, or short
descriptors. Multiple scopes may be comma-separated.

## Consequences

- Scope typos no longer break CI routing — file paths drive releases.
- Multi-package commits work naturally: change files in two packages, both
  get release entries.
- The "Valid Commit Scopes" list in AGENTS.md is a recommendation for
  changelog readability, not a CI gate.
- Type still matters: `feat` → minor, `fix` → patch, `!` → major
  (see ADR 0004).
- Refactor / docs / test / perf / ci-only changes fold into `chore`.

## References

- AGENTS.md "Commit Message Rules"
- ADR 0003 — Release Please for monorepo releases
- ADR 0004 — Breaking changes use `!` plus `BREAKING CHANGE:` footer
