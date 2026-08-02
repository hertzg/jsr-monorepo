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

| input                                      | rule         | resolves to             |
| ------------------------------------------ | ------------ | ----------------------- |
| `jsr:@binstruct/png`, `npm:x`, `https://…` | has a scheme | unchanged               |
| `./x`, `/abs/x`, `mod.ts`, `pkg/mod.mts`   | is a path    | `file://` URL under cwd |
| `@hertzg/xhb`                              | starts `@`   | `jsr:@hertzg/xhb`       |
| `png`, `wav@0.2.0`                         | bare         | `jsr:@binstruct/png`    |

A scheme requires **at least two lowercase characters** before the colon
(`^[a-z][a-z0-9+.-]+:`), so a bare name can never be mistaken for one. A path is
anything beginning with `.` or `/`, or ending in a JS/TS module extension —
`.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`, the whole set the
runtime will load. Omitting one is not cosmetic: with `.mts` missing, the real
module `./pkg/mod.mts` fell through to the catch-all and was rejected as
something it was not.

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

**A local specifier is imported as the module `deno doc` resolved, not as it was
typed.** The disagreement above has a second half that anchoring did not close:
`deno doc ./pkg` enters the directory and documents the module inside it, while
dynamic `import()` refuses a directory outright with
`ERR_UNSUPPORTED_DIR_IMPORT`. `binstruct ./pkg decode` therefore listed the
package's coders, inferred the lone one, printed a `TRY` line promising the
command worked, and then died on the import — discovery and execution looking at
different things again, only louder.

An earlier attempt closed it by classifying: a path ending in a module extension
was a `path`, anything else beginning with `.` or `/` was a `directory`, and the
`directory` form was refused before discovery ran. That could not work, and its
two failures are the same failure. `file:///abs/pkg` names exactly the same
directory as `./pkg` and was classified `scheme`, so it skipped the refusal
entirely — and this is not an exotic spelling, since the header prints
`→ file:///…` for every local path and `--docs` prints `Defined in file:///…`,
so the tool taught a form it then could not accept. Meanwhile `./pkg/mod.mts`
was called a directory, because the extension list was short. **Whether a
specifier names a directory is a fact about the target, not about how the
argument was typed**, and no amount of pattern-matching on the string decides
it.

So classification stops at `path`, and the question is answered by the one
component that already knows: `deno doc --json` keys its output by the module it
resolved, so `./pkg` and `file:///abs/pkg` alike come back keyed
`file:///abs/pkg/mod.ts`. That key is carried on `PackageSurface.entrypoint`,
and a **local** specifier — `ResolvedSpecifier.local`, true for a path and for a
`file:` URL typed in full — is imported through it. Discovery and execution then
use literally the same URL, by construction rather than by agreement, and
directories work instead of being refused.

This is not the filesystem probe the refusal was chosen to avoid. Nothing is
stat'd and no entrypoint is guessed: the CLI already ran `deno doc` on every
invocation (ADR 0002), and this reads an answer that was in the output all
along. Resolution itself stays a pure function of the input string and the
working directory; the substitution happens afterwards, in `cli.ts`, with the
subprocess's own report in hand.

The substitution is **scoped to local specifiers**. `jsr:`, `npm:` and
`http(s):` specifiers are handed to `import()` exactly as the user wrote them.
Their symbols are located at `https://jsr.io/@scope/name/1.2.3/mod.ts`, and
importing that URL would load the package by a route that bypasses the version
resolution, the import map and the lockfile the user's project resolved it
through — a much bigger change than the bug being fixed. Only the `file:` case
has a discovered URL that means the same thing as what was typed.

`ResolvedSpecifier.input` and `.short` keep the typed form, so listings, `TRY`
lines and the left-hand half of the header still say `./pkg`. Reading
`Deno.cwd()` is the one thing resolution takes from outside its argument, and
only for the path forms.

Version suffixes ride along: `wav@0.2.0` becomes `jsr:@binstruct/wav@0.2.0`,
which `deno doc` resolves (verified against `jsr:@binstruct/png@0.3.2`).

Bare-name resolution is **unconditional**. There is no lookup against the
registry and no fallback to another scope: `binstruct
xhb` resolves to
`jsr:@binstruct/xhb`, fails to load, and the error says that bare names mean
`@binstruct` and that other scopes need their full name.

The first line of output is `package: <short> → <resolved>`, with the arrow and
the resolved form present only when the two differ. Both halves earn their
place. The short form leads because every other line on the screen is written in
it, and a header spelled differently reads as being about a different package —
which is exactly what an absolute `file://` URL did to a local run, whose header
and whose `TRY` lines named the same package two ways. The resolved form follows
because shorthand nobody sees expanding is shorthand nobody can trust: `png` has
to be seen becoming `jsr:@binstruct/png` somewhere, and this is the one place it
is. Everything else — listings, `TRY` lines, and the inferred-coder notice of
ADR 0005 — uses the short form alone; the shorthand only helps if the tool
teaches it.

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
- **`binstruct ./pkg` works, and works the same as
  `binstruct
  file:///abs/pkg`.** Whatever entrypoint `deno doc` settles on is
  the one that runs, whether or not it is called `mod.ts`, so there is no
  filename for the CLI to guess wrong.
- **A directory `deno doc` cannot read is still a dead end.** It documents every
  module it finds in a directory rather than following a `deno.json` `exports`
  map, so a package directory holding non-module files fails there — reported as
  an unreadable package, the same as any other `deno doc` failure, and never as
  a promise the run then breaks.
- **The escape hatch keeps the old behaviour.** When discovery is unavailable no
  entrypoint was reported, so the typed specifier is imported as before and a
  directory fails at the import. That path never promised anything either.
- **The header is two forms, not one.** A line that carried only the resolved
  specifier disagreed with every other line on the screen; one that carried only
  the short form would hide the expansion the shorthand depends on.
- **Cross-scope discovery is deliberately absent.** `binstruct xhb` will not
  find `@hertzg/xhb` for you, per ADR 0003.
- **Scheme detection is a heuristic.** Two lowercase characters is enough for
  every scheme that matters here while leaving single-letter Windows drive
  prefixes out of scope.

## References

- `specifier.ts` — `resolveSpecifier`, `ResolvedSpecifier.local`
- `cli.ts` — `importSpecifier`, where the substitution is scoped
- `loader.ts` — `loadCoder`, which receives the specifier to import
- `@binstruct/cli` ADR 0002 — where the entrypoint comes from
- `@binstruct/cli` ADR 0003 — why the implied scope is `@binstruct`
- `@binstruct/cli` ADR 0001 — where resolved and short forms are displayed
