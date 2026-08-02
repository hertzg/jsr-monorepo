# ADR 0003 — The package list is a generated, `@binstruct`-only registry bundled in the CLI

**Status:** Accepted

## Context

Level 0 of ADR 0001 — bare `binstruct` — must list the packages worth trying.
Discovery by `deno doc` (ADR 0002) answers "what is in this package" but
presupposes a package name, so it cannot produce this list.

Three sources were available: query the JSR scope API at runtime, bundle a
generated list, or hand-maintain a list. The JSR API is always current but adds
a network round trip and a network permission to an otherwise offline command,
and fails on a plane. Hand-maintenance drifts silently.

A second question is scope. `@hertzg/*` also contains packages built on
binstruct, and a bare name could in principle be resolved across both scopes.
But `@hertzg` is a general-purpose utility scope — `mymagti-api`, `wg-keys`,
`xhb`, `routeros-api` — that has nothing to do with binary format decoding.
Mixing the two would present a list where most entries are irrelevant to the
tool's subject.

## Decision

The CLI bundles a generated registry containing **package names only**,
restricted to the `@binstruct` scope, excluding `@binstruct/cli` itself. An
entry earns its place by exposing at least one coder under the ADR 0002 rule.

The registry stores no descriptions. Every package name in this scope _is_ the
format name — `png`, `tcp`, `wav`, `sqlite` — so prose adds nothing at the
moment of choosing, while 30+ rows of it would fill the screen. Descriptions
appear at level 1, once one package has been picked, taken from its module doc.

A `_tools/check_cli_registry.ts` check, wired into `deno task lint`, regenerates
the list and fails if it differs from the committed file.

Packages outside `@binstruct` remain fully usable — `@hertzg/xhb`, `npm:…`,
`https://…`, `./local` all work as specifiers (ADR 0004). They are simply not
part of the discovery surface, and an unknown bare name gets an error that says
so rather than a cross-scope search.

## Consequences

- **Level 0 is instant and offline.** No network, no subprocess, no new
  permission.
- **The list can go stale between releases.** A format package added after the
  last CLI release is missing from the listing until the CLI ships again. It
  stays usable throughout — the registry is a hint, not a gate.
- **Staleness self-corrects.** The generated file lives under
  `packages/@binstruct/cli/`, so adding a format package touches a path Release
  Please attributes to the CLI, which cuts the release that carries the updated
  list. This is the same mechanism that makes `_deps.snap` diffs releasable
  under repo ADR 0005.
- **Every new format package forces a CLI release.** Intended, and the cost of
  the previous point.
- **Names-only keeps the generator trivial** — a directory scan plus the ADR
  0002 probe, with no description field to source, truncate or wrap.
- **A `@binstruct` package that exposes no zero-argument coder still appears**
  in the list and then dead-ends at level 1. `pcap` is this case today.

## References

- `_tools/check_readme.ts`, `_tools/check_labeler.ts` — the existing
  generated-file-plus-lint-check pattern
- Repo ADR 0005 — deps snapshot pinning, same release-attribution argument
- Repo ADR 0009 — two-tier workspace layout, why the scopes are separate
- `@binstruct/cli` ADR 0002 — the probe that decides membership
- `@binstruct/cli` ADR 0004 — specifier resolution for everything outside the
  registry
