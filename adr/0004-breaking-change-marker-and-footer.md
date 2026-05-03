# ADR 0004 — Breaking changes use `!` marker plus `BREAKING CHANGE:` footer

**Status:** Accepted

## Context

Release Please needs to detect breaking changes deterministically to trigger
major version bumps. Conventional Commits supports either the `!` marker
after the scope or a `BREAKING CHANGE:` footer; using both removes ambiguity
for the tool and makes the changelog clearer to humans by surfacing migration
notes in the commit body.

## Decision

A breaking change requires **both**:

1. `!` after the scope, e.g. `feat(@hertzg/ip)!: rename parse functions`
2. A `BREAKING CHANGE:` footer in the commit body describing the migration.

Example:

```
feat(@hertzg/ip)!: auto-unwrap IPv4-mapped IPv6 in parseIp

BREAKING CHANGE: parseIp("::ffff:192.168.1.1") now returns a number
instead of bigint.
```

## Consequences

- Forgetting the footer means the changelog entry lacks migration guidance.
- Forgetting the `!` means release-please may miss the major bump.
- The double-marker convention is enforced by review, not by lint — keep
  PR review attentive to it.

## References

- AGENTS.md "Breaking Changes"
- ADR 0003 — Release Please for monorepo releases
