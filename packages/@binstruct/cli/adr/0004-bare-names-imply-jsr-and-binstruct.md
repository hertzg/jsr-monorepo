# ADR 0004 — A bare package name implies `jsr:` and the `@binstruct` scope

**Status:** Accepted

## Context

The specifier is the first thing typed on every invocation, and in the
overwhelming majority of cases it is one of thirty `@binstruct` packages.
Spelling `jsr:@binstruct/png` in full makes the shortest useful command 34
characters of boilerplate before anything interesting happens, and it appears in
every example, every error message and every `TRY` line the CLI prints under
ADR 0001.

The specifier is forwarded to dynamic `import()` and to `deno doc`, both of
which accept schemes, bare npm names, URLs and paths, so any shorthand has to be
layered on without shadowing those forms.

## Decision

The specifier is resolved by first match:

| input                                      | rule              | resolves to             |
| ------------------------------------------ | ----------------- | ----------------------- |
| `jsr:@binstruct/png`, `npm:x`, `https://…` | has a scheme      | unchanged               |
| `./x`, `../x`, `/abs/x`, `mod.ts`          | looks like a path | `file://` URL under cwd |
| `@hertzg/xhb`                              | starts with `@`   | `jsr:@hertzg/xhb`       |
| `png`, `wav@0.2.0`                         | bare              | `jsr:@binstruct/png`    |

A scheme requires **at least two lowercase characters** before the colon
(`^[a-z][a-z0-9+.-]+:`), so a bare name can never be mistaken for one. A path is
anything beginning with `.` or `/`, or ending in a JS/TS extension.

A path is **anchored to the working directory** and handed on as a `file://`
URL. This row originally read "unchanged", which was wrong: the two consumers of
a specifier disagree about what a relative one is relative to. `deno doc`
resolves it against the process's working directory; dynamic `import()` resolves
it against the importing module, which is `loader.ts` inside the CLI package.
`binstruct ./pkg` therefore listed the user's coders and then imported — or
failed to import — a `./pkg` next to the CLI's own sources, and a user file
whose coder name collided with one of the CLI's exports would have been run
instead of theirs. Published from JSR the mismatch is total: every relative path
becomes `https://jsr.io/@binstruct/cli/<version>/pkg`.

`ResolvedSpecifier.input` and `.short` keep the typed form, so headers, listings
and `TRY` lines still say `./pkg`. Reading `Deno.cwd()` is the one thing
resolution takes from outside its argument, and only for this form.

Version suffixes ride along: `wav@0.2.0` becomes `jsr:@binstruct/wav@0.2.0`,
which `deno doc` resolves (verified against `jsr:@binstruct/png@0.3.2`).

Bare-name resolution is **unconditional**. There is no lookup against the
registry and no fallback to another scope: `binstruct
xhb` resolves to
`jsr:@binstruct/xhb`, fails to load, and the error says that bare names mean
`@binstruct` and that other scopes need their full name.

The CLI always echoes the resolved specifier as the first line of output, so the
expansion is never invisible. Listings and `TRY` lines use the short form — the
shorthand only helps if the tool teaches it.

## Consequences

- **The common command loses 20 characters**, and every generated `TRY` line
  becomes short enough to read at a glance.
- **Resolution consults nothing but the input string and the working
  directory.** It does not touch the registry, the network or the filesystem, so
  it cannot behave differently on a stale registry or offline. The `Deno.cwd()`
  read means a path form now needs `--allow-read`, which every documented
  invocation already has.
- **A local directory named like a package is shadowed.** `png/` resolves to the
  JSR package, not the directory; `./png` disambiguates. Documented in `--help`,
  not defended against.
- **Cross-scope discovery is deliberately absent.** `binstruct xhb` will not
  find `@hertzg/xhb` for you, per ADR 0003.
- **Scheme detection is a heuristic.** Two lowercase characters is enough for
  every scheme that matters here while leaving single-letter Windows drive
  prefixes out of scope.

## References

- `loader.ts` — `loadCoder`, which receives the resolved specifier
- `@binstruct/cli` ADR 0003 — why the implied scope is `@binstruct`
- `@binstruct/cli` ADR 0001 — where resolved and short forms are displayed
