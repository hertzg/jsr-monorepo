# ADR 0006 — The package list is fetched from JSR, cached, and optional

**Status:** Accepted — implemented

> Implemented. `scope.ts` fetches
> `https://jsr.io/api/scopes/binstruct/packages`, keeps the entries with a
> published version, caches the result under the OS cache directory, and answers
> with an empty list and a reason when it cannot; `packageGuide` in `cli.ts`
> renders whichever of the two it gets.

## Context

ADR 0003 bundled the package list: a generated `registry.ts`, produced by
walking `packages/@binstruct/*` and probing each entrypoint, checked by
`_tools/check_cli_registry.ts` in `deno task lint`. It argued that the list
could go stale between releases but that the staleness would self-correct,
because adding a format package touches a path Release Please attributes to the
CLI.

**The list was correct on the day it was generated, and that is the whole
problem.** It is a hardcoded list: what it names is what the workspace held when
the CLI was last released, so a package published between releases — from this
repository or any other — is absent from it until the CLI itself ships again,
and a user typing `binstruct` is shown last release's answer to a question about
today.

The lint check could not close that gap, and it is worth being precise about
why. It compared the generated file against the same directory scan that
generated it. That makes the file **self-consistent** — it agrees with the
workspace — and self-consistency is not currency: both halves of the comparison
are the same stale source. A green check said the list matched the directories,
never that it matched JSR.

The self-correction claim also assumed every `@binstruct` package is published
from this repository. Nothing enforces that. Nothing in the scope contradicts it
today, but the list's correctness resting on an unenforced convention is the
kind of thing that is true until it is not.

Meanwhile the tool this list belongs to is a tool whose entire premise is that
it _discovers_ what is available: level 1 shells out to `deno doc` rather than
hardcoding coder names (ADR 0002), and refuses to guess when discovery fails.
Level 0 was the one level that shipped its answers.

> **Correction.** An earlier revision of this ADR, and the commit message
> `6a6df46` that carries it, argued the case from a defect that does not exist:
> that `@binstruct/bencode` was a published package the generator had never
> seen, that the registry therefore listed 31 packages where JSR had 32, and
> that `binstruct bencode` worked anyway. None of that is true. `bencode` is a
> **reserved name with no published version** — the scope listing gives it
> `latestVersion: null` and `versionCount: 0`, and
> `https://jsr.io/@binstruct/bencode/meta.json` answers 404 — so the registry's
> 31 entries were exactly the 31 published non-`cli` packages, and
> `binstruct bencode` answered `cannot read jsr:@binstruct/bencode`. The commit
> is pushed and is left as it stands; this note is the record. The reservation
> is not the argument for the change, but it is the reason the decision below
> carries a publication filter.

## Decision

Level 0's options come from JSR, live:

```
GET https://jsr.io/api/scopes/binstruct/packages?limit=100
```

Two kinds of entry are dropped, and nothing else is: `@binstruct/cli`, and any
name JSR answers with **no `latestVersion`**. The result is cached under the OS
cache directory (`<cache>/binstruct-cli/scope-binstruct.json`) for **24 hours**.

**A scope listing is a listing of claimed names, not of packages.** JSR reserves
a name at creation and lists it from that moment, published or not:
`@binstruct/bencode` sits in the answer today with `latestVersion: null` and
`versionCount: 0`, and `jsr:@binstruct/bencode` does not resolve. Offering it at
level 0 puts a name on the screen that the very next word cannot load — the one
failure mode a suggestion list must not have, and one the bundled registry did
not have, because a directory that exists is a package that shipped. The filter
is what buys the same guarantee from a live source. It also keeps `nearestName`
honest: a listed-but-unloadable name reaches the refusal with itself among the
candidates, and the refusal for `bencode` ended `did you mean bencode?`.

Because the filter reads a field, the cache stores it: the cache file is written
in the shape JSR answers with, so a cached listing round-trips through the same
reader and the same filter.

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
Ethernet/IPv4 variant (RFC 826). Built on @hertzg/binstruct."), and thirty-one
of those turn a six-row block into a screenful that pushes the `TRY` line past
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

- **The list is never stale.** A package published five minutes ago appears
  without anything being released, and a name that never shipped does not appear
  at all. Today the screen shows **31 names** — the whole scope of 33, less
  `cli` and less the unpublished `bencode` reservation — which is what the
  generated registry listed, arrived at from a source that will still be right
  next month.
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
- **The list is what JSR says is loadable, not what the CLI can drive.** A
  package exposing no zero-argument coder is listed and dead-ends at level 1 —
  the same behaviour as under ADR 0003, now for a different reason: membership
  is publication, not a probe. Membership is not _usefulness_; it is only the
  promise that the name resolves.
- **A newly reserved name stays invisible until its first publish.** That is the
  filter working, and it is also its only cost: a package published minutes ago
  appears, one merely named does not.
- **A scope over 100 packages would be truncated**, not paged. Acceptable for a
  list whose job is to suggest a starting point, and revisited if it ever
  matters.
- **The cache can be wrong for a day.** It is a suggestion list; a name missing
  from it still resolves.
- **Tests do not touch the network.** In `scope.test.ts`, `fetch`, the
  permission query and the cache directory are supplied by **every** case, which
  is what makes the offline, non-200, malformed, stale-cache and no-permission
  paths reachable at all — none of them were, under a bundled constant. The
  permission stub was at first written only for the denial cases, which left the
  granted paths reading whatever flags the suite happened to run under while the
  file's own header claimed otherwise; it now covers both.

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
