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

Resolution is a pure function of the input string and the working directory.
What is at the far end of a `file:` URL is a separate question, asked afterwards
and answered by the filesystem, not by the table.

A scheme requires **at least two lowercase characters** before the colon
(`^[a-z][a-z0-9+.-]+:`), so a bare name can never be mistaken for one. A path is
anything beginning with `.` or `/`, or ending in a JS/TS module extension —
`.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`, the whole set the
runtime will load, in `isModulePath`. The list is no longer what decides file
from directory, but it is still what the directory refusal offers as candidates,
so a gap in it hides a real module from the listing.

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

**A package argument must name a module, and a directory is refused — decided by
inspecting the resolved target, never by inspecting the spelling.** The
disagreement above has a second half that anchoring did not close:
`deno doc
./pkg` walks into the directory while dynamic `import()` refuses one
outright with `ERR_UNSUPPORTED_DIR_IMPORT`. `binstruct ./pkg decode` therefore
listed coders, inferred one, printed a `TRY` line promising the command worked,
and then died on the import.

Two mechanisms were tried before this one and both were wrong.

The first **classified by spelling**: a path ending in a module extension was a
`path`, anything else beginning with `.` or `/` was a `directory`, and
`directory` was refused. Its two failures are one failure. `file:///abs/pkg`
names exactly the same directory as `./pkg` and was classified `scheme`, so it
skipped the refusal entirely and died in `ERR_UNSUPPORTED_DIR_IMPORT` — and that
is not an exotic spelling, since the header prints `→ file:///…` for every local
path and `--docs` prints `Defined in file:///…`, so the tool taught a form it
then could not accept. Meanwhile `./pkg/mod.mts` was called a directory, because
the extension list was short, and was offered `./pkg/mod.mts/mod.ts` — a `TRY`
line for a path that cannot exist. **Whether a specifier names a directory is a
fact about the target, not about how the argument was typed.**

The second **let `deno doc` resolve the directory**, on the belief that its
output is keyed by "the module it resolved". It is not. Pointed at a directory,
`deno doc --json` emits **one node per module file it finds underneath**, and
the code read `Object.entries(doc.nodes)[0]` — whichever key sorted first. A
directory holding `mod.ts` (a two-byte coder) and `aaa_other.ts` (a one-byte
internal one) answered `using coder: internalOnly`, decoded two bytes of input
as the one-byte structure and exited **0**: plausible, wrong, silent, which is
the failure class ADR 0002's always-on discovery exists to prevent. The same
mechanism called the ordinary `deno.json` + `mod.ts` layout empty, reporting
`exposes no coders — its module graph could not be read:
[ERR_UNSUPPORTED_DIR_IMPORT]`,
because `deno.json` sorts before `mod.ts`.

So: **refusal, decided on the resolved target.** When the resolved specifier has
the `file:` scheme, `Deno.stat` is called on it before discovery runs
(`inspectLocalTarget` in `target.ts`); `isDirectory` refuses, and a `NotFound`
gets its own "no such path" message rather than the directory one. Spelling is
irrelevant by construction: `./pkg`, `/abs/pkg`, `file:///abs/pkg`, a trailing
slash and a symlink all resolve to one URL and one target, and `Deno.stat`
follows symlinks.

Refusal is the only resolution-free option, and that is the whole argument for
it. `import()` cannot load a directory **at all**, so there is no "the way
`import()` would resolve this directory" for the CLI to agree with. Every
alternative — first node, the `mod.ts` convention, a `deno.json` `exports` map —
is an opinion only the CLI holds, and an opinion only the CLI holds can disagree
with what the user meant. That disagreement is the defect class; both attempts
above are instances of it. Refusing has no such failure mode: it cannot pick
wrong, because it does not pick.

What the refusal _does_ do is read the directory and offer the module files that
are in it, exactly as the coder level offers coders:
`NEXT <package> — name the
module inside the directory`, a `MODULES in ./pkg`
block, and a `TRY` line using one of the listed names. **Listing is guidance;
picking would be resolution.** The `TRY` line takes the first name listed,
because it is a name that demonstrably exists — suggesting `mod.ts` unasked
would be the same guess in prose — and a directory with no module files gets a
plain refusal with no `TRY`, since the refusal must never name a command that
does not exist. Nothing reads `deno.json`.

Nothing is substituted for the resolved specifier anywhere. Discovery, `--docs`
and `import()` are handed the same string, which now names one module by
construction. In particular `jsr:`, `npm:` and `http(s):` specifiers go to
`import()` exactly as written: their symbols are located at
`https://jsr.io/@scope/name/1.2.3/mod.ts`, and importing that URL would load the
package by a route that bypasses the version resolution, the import map and the
lockfile the user's project resolved it through.

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
  JSR package, not the directory; `./png` disambiguates — and then says to name
  the module inside it. Documented in `--help`, not defended against.
- **`binstruct ./pkg` never works, whatever is in `./pkg`**, and neither does
  any other spelling of the same directory. The cost is one extra word for
  everyone with a conventional layout; the price of the alternative was
  confident output from a module nobody named.
- **A package whose entrypoint is unusual costs nothing extra.** The listing
  shows what is actually there, so there is no filename for the CLI to guess
  wrong and no convention for the user to work around.
- **The refusal needs `--allow-read`** for the `stat` and the `readDir`, which
  every documented invocation already has. A target that cannot be inspected is
  refused rather than assumed to be a module: assuming is what produced the
  wrong-module decode.
- **The escape hatch is unaffected.** Naming a coder when discovery is
  unavailable still works; the refusal happens earlier and for a different
  reason, and it applies whether or not discovery could have run.
- **The header is two forms, not one.** A line that carried only the resolved
  specifier disagreed with every other line on the screen; one that carried only
  the short form would hide the expansion the shorthand depends on.
- **Cross-scope discovery is deliberately absent.** `binstruct xhb` will not
  find `@hertzg/xhb` for you, per ADR 0003.
- **Scheme detection is a heuristic.** Two lowercase characters is enough for
  every scheme that matters here while leaving single-letter Windows drive
  prefixes out of scope.

## References

- `specifier.ts` — `resolveSpecifier`, `isModulePath`
- `target.ts` — `inspectLocalTarget`, the stat that decides
- `cli.ts` — `directoryGuide`, `missingPathGuide`, where refusal is rendered
- `loader.ts` — `loadCoder`, which receives the specifier to import
- `@binstruct/cli` ADR 0002 — why discovery needs a single-module specifier
- `@binstruct/cli` ADR 0003 — why the implied scope is `@binstruct`
- `@binstruct/cli` ADR 0001 — where resolved and short forms are displayed
