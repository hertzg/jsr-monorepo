# ADR 0011 — Dependency age policy is declared once and mirrored in Renovate

**Status:** Accepted

## Context

Deno 2 enforces a **minimum dependency age**: a registry version published more
recently than the configured window is refused at resolution time, to blunt the
window in which a compromised release can be pulled into a build. Unset, the
default is 24 hours. It is not a warning — resolution fails:

```
error: Could not find version of '@std/xml' that matches specified version
constraint '^0.2.0'

A newer matching version was found, but it was not used because it was newer
than the specified minimum dependency date ...
```

Renovate has no knowledge of that policy. It opens a PR as soon as it sees a new
release, so for a package published in the last day, Renovate raises a PR that
Deno structurally refuses to resolve. Every job that installs anything — `test`,
`docs`, and any future job — fails, on a PR whose content is fine. The failure
is also misleading: it looks like a broken dependency rather than a bot that ran
too early.

This is not hypothetical. PR #182 (`@std/xml` `^0.1.0` → `^0.2.0`) was opened
roughly eight hours after the version was published and failed exactly this way;
the bump itself was correct and required no code changes.

Two knobs govern the same window from opposite ends:

- `minimumDependencyAge` in `deno.json` — what the toolchain will install.
- `minimumReleaseAge` in `renovate.json` — when the bot proposes an install.

If the second is shorter than the first, Renovate generates guaranteed-red PRs.
If it is much longer, updates simply arrive later than they need to. Leaving
Deno's side implicit makes the relationship invisible: a reader of
`renovate.json` has no way to know what "3 days" is answering to, and a change
to Deno's default would silently desynchronize the pair.

## Decision

Declare the window explicitly on both sides, with the same value:

```jsonc
// deno.json
"minimumDependencyAge": "P3D"
```

```jsonc
// renovate.json
"minimumReleaseAge": "3 days"
```

Three days rather than Deno's 24-hour default: it is a more useful supply-chain
window, and it leaves margin for a Renovate PR that sits in the queue before CI
runs.

`minimumReleaseAge` must always be **greater than or equal to**
`minimumDependencyAge`. Renovate's `internalChecksFilter` defaults to
`"strict"`, so a release inside the window is skipped outright rather than
raised as a pending branch — no PR is created until the version is installable.

The values are written in different notations because the two tools accept
different ones. Deno takes an ISO-8601 duration (`P3D`), an RFC3339 datetime, or
a plain number of minutes — it rejects `"3 days"` and `"72h"` alike. Renovate
takes a humanized duration. They must be changed together.

## Consequences

- **Renovate PRs are installable on arrival.** The age gate can no longer be the
  cause of a red dependency PR.
- **The policy is greppable.** `minimumDependencyAge` in `deno.json` is the
  single declaration of intent; `renovate.json` mirrors it.
- **Upgrades are visible three days late.** Acceptable for this repo — no
  dependency here is on a release cadence where that matters.
- **The pair can still drift**, because nothing mechanically enforces the
  relationship between two files in two different notations. This ADR is the
  enforcement. If it drifts, the symptom is the CI failure described above.
- **Deno's default is no longer load-bearing.** Should upstream change it, this
  repo is unaffected.
- A local `deno` invocation can still bypass the window with `--min-dep-age=0`;
  that is a deliberate, per-command escape hatch and does not change what CI
  does.

## References

- `deno.json` — `minimumDependencyAge`
- `renovate.json` — `minimumReleaseAge`
- ADR 0001 — Bare imports via import map
- ADR 0005 — Dependency snapshot pinning
- https://docs.deno.com/go/minimum-dependency-age
- https://docs.renovatebot.com/configuration-options/#minimumreleaseage
