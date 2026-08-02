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

| input                                      | rule                 | resolves to                            |
| ------------------------------------------ | -------------------- | -------------------------------------- |
| `jsr:@binstruct/png`, `npm:x`, `https://…` | has a scheme         | unchanged                              |
| `./x/mod.ts`, `/abs/mod.js`, `mod.ts`      | names a module file  | `file://` URL under cwd                |
| `./x`, `../x`, `/abs/x`                    | names no module file | `file://` URL under cwd — then refused |
| `@hertzg/xhb`                              | starts with `@`      | `jsr:@hertzg/xhb`                      |
| `png`, `wav@0.2.0`                         | bare                 | `jsr:@binstruct/png`                   |

A scheme requires **at least two lowercase characters** before the colon
(`^[a-z][a-z0-9+.-]+:`), so a bare name can never be mistaken for one. A path is
anything beginning with `.` or `/`, or ending in a JS/TS extension; the
extension is also what separates the two path rows.

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

**A path must name a module file.** The disagreement above has a second half
that anchoring did not close: `deno doc ./pkg` walks into the directory and
documents `./pkg/mod.ts`, while dynamic `import()` refuses a directory outright
with `ERR_UNSUPPORTED_DIR_IMPORT`. `binstruct ./pkg decode` therefore listed the
package's coders, inferred the lone one, printed a `TRY` line promising the
command worked, and then died on the import — discovery and execution looking at
different things again, only louder. So a path ending in a module extension is a
`path`, anything else beginning with `.` or `/` is a `directory`, and the
`directory` form is **refused before discovery runs**, naming the module to type
instead (`./pkg/mod.ts`) in its `TRY` line.

Refusing was chosen over resolving. The CLI could find the entrypoint the way
`deno doc` does, but only by probing the filesystem — a `stat`, then `mod.ts`,
or a `deno.json` `exports` map — which turns resolution from a function of its
input into a second, independent opinion about which module a directory means,
with its own ways to disagree with the one `import()` holds. The classification
stays syntactic instead, and `mod.ts` appears only as a _suggestion in prose_
that the user can correct, never as a lookup: nothing here is read off disk.

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
  JSR package, not the directory; `./png` disambiguates — and then says to write
  `./png/mod.ts`. Documented in `--help`, not defended against.
- **`binstruct ./pkg` never works, whatever is in `./pkg`.** A package whose
  entrypoint is not `mod.ts` gets a suggestion that is wrong in the filename and
  right in the shape, which is the cost of not probing. Both halves of the tool
  refuse it identically, so the refusal cannot become a promise the run breaks.
- **The header is two forms, not one.** A line that carried only the resolved
  specifier disagreed with every other line on the screen; one that carried only
  the short form would hide the expansion the shorthand depends on.
- **Cross-scope discovery is deliberately absent.** `binstruct xhb` will not
  find `@hertzg/xhb` for you, per ADR 0003.
- **Scheme detection is a heuristic.** Two lowercase characters is enough for
  every scheme that matters here while leaving single-letter Windows drive
  prefixes out of scope.

## References

- `loader.ts` — `loadCoder`, which receives the resolved specifier
- `@binstruct/cli` ADR 0003 — why the implied scope is `@binstruct`
- `@binstruct/cli` ADR 0001 — where resolved and short forms are displayed
