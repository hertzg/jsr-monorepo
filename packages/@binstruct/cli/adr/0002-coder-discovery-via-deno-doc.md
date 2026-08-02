# ADR 0002 — Coders are discovered by reading types with `deno doc --json`, not by importing the package

**Status:** Accepted

## Context

ADR 0001 requires the CLI to list the coders a package exposes, with a one-line
description for each, before the user has committed to running anything. Three
mechanisms could produce that list.

**Import the module and probe the exports.** Keep every export that is a
zero-arity function, call it in a `try`, and test the result with `isCoder()`
from `@hertzg/binstruct`. This works, and the CLI already imports the package to
run a coder. But it executes third-party code merely because someone typed a
package name to look around, and JavaScript does not retain JSDoc at runtime —
so the descriptions, which are the entire point of a guidance UX, are lost.

**Read the module graph with `deno info --json`.** Measured against
`jsr:@binstruct/png`: it returns
`{version, roots, modules,
redirects, packages, npmPackages}` — 45 modules of
dependency graph, **no export names and no types**. It answers "what does this
package pull in", not "what does it expose". It cannot produce the list at all.

**Read the types with `deno doc --json`.** Returns every exported symbol with
its declaration kind, parameter list, return type and JSDoc, without evaluating
anything.

## Decision

Coder discovery runs `deno doc --json --quiet <specifier>` and keeps every
declaration where:

- `kind === "function"`, and
- `def.returnType.repr === "Coder"`.

Each surviving entry yields a name, the decoded type
(`def.returnType.value.typeParams[0].repr` — the `T` in `Coder<T>`), the first
line of `jsDoc.doc`, and a count of required parameters. Entries are sorted with
zero-required-parameter coders first.

The resolved package version comes free from the same call: `location.filename`
on any symbol is `https://jsr.io/@binstruct/png/0.4.0/mod.ts`.

**So does the entrypoint.** The output is keyed by the module `deno doc`
resolved, not by the string it was handed: `./pkg` and `file:///abs/pkg` both
come back keyed `file:///abs/pkg/mod.ts`, while `jsr:@binstruct/png` is keyed by
itself. That key is returned as `PackageSurface.entrypoint`, and for a local
specifier it — not the user's argument — is what gets imported (ADR 0004). This
costs nothing: the subprocess runs on every invocation anyway, and the answer
was already in its output. It also removes the only remaining way for discovery
and execution to disagree about which module they mean, since the surface is
read from, and the coder loaded from, one and the same URL.

**`deno info` is not run on the happy path.** It is run only when discovery
finds no coders, where its dependency graph distinguishes "this package does not
depend on `@hertzg/binstruct`, it is probably not a binstruct package" from "it
is one, but ships no type declarations".

Formatted documentation is delegated rather than reimplemented. A `--docs` flag
shells out to `deno doc --filter <symbol> <specifier>` for the coder and its
decoded type. Three constraints found by measurement: the positional form
`deno doc <spec> <Symbol>` that `deno doc --help` advertises **does not work**
with a `jsr:` specifier — it resolves the symbol as a file path and errors — so
`--filter` is mandatory; `--filter` still prints the whole module doc as a
preamble, so the second block is shown only from the line where it stops
agreeing with the first; and the subprocess colours its output unconditionally,
so the colour decision is taken from the CLI's own stdout and passed down as
`NO_COLOR`.

**Discovery runs on every invocation, complete ones included.** An earlier
version skipped it whenever all three words were present, on the grounds that
nothing was being explored. That made the coder name unverified, and an
unverified name is not merely a worse error message: `pcapFile(endianness)`
called with no argument silently defaults to big-endian, so
`binstruct pcap pcapFile decode` printed a whole capture of byte-swapped numbers
and exited 0. No cheaper check distinguishes that from a correct run — a
factory's runtime `.length` counts TypeScript's optional parameters, which the
declaration-level count correctly does not — so the subprocess is the price of
the guarantee. A named coder is still taken on trust when discovery is
_unavailable_, which is what keeps the escape hatch below honest.

## Consequences

- **Exploration never executes third-party code.** Only a complete invocation
  imports the package.
- **Descriptions and decoded types are available**, so the listing can say
  `pngFile → PngFile  Complete PNG files with automatic
  chunk refinement.` and
  `--docs` can show the exact object shape to write for `encode` — a question
  the CLI could not previously answer at all.
- **Cold discovery costs ~1.0–1.7s per package; warm is ~45ms.** Deno caches the
  module graph, so the first lookup of the day pauses visibly with no spinner
  and every later one is instant. Only level 0 escapes it — a complete
  invocation pays the warm cost on every run, which is what buys the arity check
  above.
- **Discovery needs `--allow-run=deno`.** The published usage already says `-A`,
  but a tightened permission set breaks levels 1–2 while decode and encode keep
  working. Discovery failure must therefore always print the "you can still name
  the coder directly" escape hatch.
- **Packages without type declarations show zero coders**, however well they
  work at runtime. Untyped `npm:` packages are the likely case.
- **The dependency age policy applies to discovery.** A package version
  published inside the window of repo ADR 0011 makes `deno doc` fail outright,
  with a message about minimum dependency age rather than anything the user did
  wrong.
- **Detection is a string match on `Coder`.** A coder returned through a type
  alias that does not render as `Coder<…>` is invisible to discovery. This
  constrains how format packages may declare their return types.
- **A local package is imported through the entrypoint discovery reported**, so
  directories work. Where `deno doc` cannot read the directory at all — it
  documents every module it finds there rather than following a `deno.json`
  `exports` map — nothing is reported and the invocation fails as an unreadable
  package.

## References

- `loader.ts` — `loadCoder`, the runtime import path used to run
- `@hertzg/binstruct` — `isCoder`, the rejected runtime-probe route
- Repo ADR 0011 — dependency age policy
- `@binstruct/cli` ADR 0001 — the disclosure contract this feeds
