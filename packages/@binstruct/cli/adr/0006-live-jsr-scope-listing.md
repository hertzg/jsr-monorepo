# ADR 0006 — The package list is fetched from JSR, cached, and optional

**Status:** Accepted — implemented

> Implemented. `scope.ts` fetches
> `https://jsr.io/api/scopes/binstruct/packages`, caches it under the OS cache
> directory, and answers with an empty list and a reason when it cannot;
> `packageGuide` in `cli.ts` renders whichever of the two it gets.

## Context

ADR 0003 bundled the package list: a generated `registry.ts`, produced by
walking `packages/@binstruct/*` and probing each entrypoint, checked by
`_tools/check_cli_registry.ts` in `deno task lint`. It argued that the list
could go stale between releases but that the staleness would self-correct,
because adding a format package touches a path Release Please attributes to the
CLI.

**That argument was wrong, and the shipped list was already wrong.**
`@binstruct/bencode` is published in the scope and has no directory in this
workspace, so the generator — which enumerates directories — had never seen it.
The registry listed 31 packages where JSR had 32. A user typing `binstruct` was
shown a list that omitted a real package, and a bare `binstruct bencode` then
worked anyway, which is the worst of both: the list is not what is available,
and nothing on the screen says so.

The lint check did not catch this and could not. It compared the generated file
against the same directory scan that generated it — it made the list
self-consistent, not current. A generated, committed list of package names is
still a hardcoded list.

The self-correction claim also assumed every `@binstruct` package is published
from this repository. Nothing enforces that, and the one counterexample is the
one that broke it.

Meanwhile the tool this list belongs to is a tool whose entire premise is that
it _discovers_ what is available: level 1 shells out to `deno doc` rather than
hardcoding coder names (ADR 0002), and refuses to guess when discovery fails.
Level 0 was the one level that shipped its answers.

## Decision

Level 0's options come from JSR, live:

```
GET https://jsr.io/api/scopes/binstruct/packages?limit=100
```

`@binstruct/cli` is dropped from the answer; nothing else is filtered. The
result is cached under the OS cache directory
(`<cache>/binstruct-cli/scope-binstruct.json`) for **24 hours**.

**The listing is a hint, and every failure resolves to "no list", never to an
error.** No `--allow-net`, no network, a non-200 answer, a body that is not a
listing, a request that times out after three seconds — each produces an empty
list carrying a reason, and level 0 then prints:

```
cannot list the @binstruct scope: <reason>
name a package anyway — a bare name means jsr:@binstruct/<name>, and jsr:,
npm:, https:// and ./local/mod.ts specifiers all work

NEXT  <package>
  the format your bytes are in; a bare name means jsr:@binstruct/<name>

PACKAGES
  none — the listing could not be fetched

TRY
  binstruct png
```

This is the same shape as the discovery failure of ADR 0002, which still prints
the "you can still name the coder directly" escape hatch. Nothing about the
listing reaches stdout, under any outcome.

**On a failed request an expired cache is preferred to no list.** The order is:
fresh cache, then network, then stale cache, then nothing. A user who has run
the tool once has a list on a plane.

**Every permission is queried, never assumed.** `Deno.permissions.query` does
not prompt, so a missing `--allow-net=jsr.io` skips the request instead of
stopping a pipeline to ask for it — which is the one thing a hint must never do.
`--allow-env` (locating the cache directory) and `--allow-read` /
`--allow-write` on it are treated the same way, each degrading only the part it
covers. `--allow-net=jsr.io` is listed in a `PERMISSIONS` block in `--help`,
next to the `--allow-run=deno` that level 1 already needed.

**Level 0 still shows names only.** The listing carries a description per
package, which the bundled registry could not have had — ADR 0003 recorded that
there was no source for one. There is now, and the screen-space argument it also
made survives on its own: JSR's descriptions run to a sentence or two each ("ARP
(Address Resolution Protocol) packet encoder/decoder for the common
Ethernet/IPv4 variant (RFC 826). Built on @hertzg/binstruct."), and thirty-two
of those turn a seven-row block into a screenful that pushes the `TRY` line past
the fold at the one moment the user has typed nothing and needs it most. Every
name in this scope is the format name. A description belongs to the package that
has been chosen, which is level 1's job.

**The descriptions are kept and spent in one place**: when a bare name fails to
resolve and the listing holds a near-match, the refusal says
`did you mean png? — PNG image file format.` There the screen holds exactly one
candidate, and the line saying what it decodes is what makes the suggestion an
answer rather than a spelling correction.

`registry.ts`, `registry.test.ts`, `_tools/check_cli_registry.ts` and the
`lint:cli-registry` task are deleted.

## Consequences

- **The list is never stale.** A package published five minutes ago appears, and
  a package that never shipped does not. `bencode` is listed today without
  anything being released.
- **Adding a format package no longer forces a CLI release.** ADR 0003 called
  that coupling intended; it was the cost of the bundling, and it goes with it.
- **Level 0 is no longer offline-by-construction.** It is offline-_tolerant_
  instead: one cached request a day, and a degraded screen that still teaches
  the shorthand rule when even that is unavailable. This is the real cost of the
  decision and the one worth arguing about.
- **A new permission appears in the story.** `--allow-net=jsr.io` earns the
  package list. Its absence is not an error, so
  `deno run --allow-run=deno
  jsr:@binstruct/cli` keeps working with one block
  missing.
- **Level 0 can now be slow.** Bounded at three seconds, once a day, and never
  on a cache hit.
- **The list is what JSR says, not what the CLI can drive.** A package exposing
  no zero-argument coder is listed and dead-ends at level 1 — the same behaviour
  as under ADR 0003, now for a different reason: membership is publication, not
  a probe.
- **A scope over 100 packages would be truncated**, not paged. Acceptable for a
  list whose job is to suggest a starting point, and revisited if it ever
  matters.
- **The cache can be wrong for a day.** It is a suggestion list; a name missing
  from it still resolves.
- **Tests do not touch the network.** `fetch`, the permission query and the
  cache directory are all supplied by the test, which is what makes the offline,
  non-200, malformed, stale-cache and no-permission paths reachable at all —
  none of them were, under a bundled constant.

## References

- `scope.ts` — `listScopePackages`, `readScopeListing`
- `cli.ts` — `packageGuide`, `listingNotes`, `nearestPackage`
- `@binstruct/cli` ADR 0001 — the disclosure levels this feeds
- `@binstruct/cli` ADR 0002 — coder discovery, the same hint-not-gate rule one
  level down
- `@binstruct/cli` ADR 0003 — superseded; why the scope is `@binstruct`, and why
  names carry no descriptions
- `@binstruct/cli` ADR 0004 — specifier resolution, which the listing never
  gates
