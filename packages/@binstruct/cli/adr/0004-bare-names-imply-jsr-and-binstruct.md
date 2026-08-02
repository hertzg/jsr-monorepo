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
| `@hertzg/xhb`, `@binstruct/png/sub`        | starts `@`   | `jsr:@hertzg/xhb`       |
| `./x`, `/abs/x`, `pkg/`, `a/b`, `mod.ts`   | is a path    | `file://` URL under cwd |
| `png`, `wav@0.2.0`                         | bare         | `jsr:@binstruct/png`    |

Resolution is a pure function of the input string and the working directory.
What is at the far end of a `file:` URL is a separate question, asked afterwards
and answered by the filesystem, not by the table.

A scheme requires **at least two lowercase characters** before the colon
(`^[a-z][a-z0-9+.-]+:`), so a bare name — or a single-letter Windows drive
prefix — can never be mistaken for one.

**The table enumerates the registry coordinate, and calls what is left a path.**
A JSR or npm coordinate is exactly one of:

```
name
name@version
@scope/name
@scope/name@version
@scope/name/sub-entrypoint
```

Every one of those either starts with `@` or contains no `/` at all. Therefore
**a non-scheme input that contains a `/` and does not start with `@` cannot be a
registry coordinate, and is a path.** That is the third row, and it is a closed
rule: it follows from the grammar of the thing being excluded rather than from a
list of the ways a path can look.

The rule ran the other way round for five releases — enumerate the path
spellings, call the remainder a registry name — and it leaked five times, once
per attempt to complete the list. The set of ways to spell a path is open-ended;
the set of ways to spell a coordinate is not. The last leak is the one that
settles the direction: `arp/` begins with neither `.` nor `/` and ends in no
module extension, so it fell through to `bare`, expanded to
`jsr:@binstruct/arp/`, never reached `inspectLocalTarget` at all, and decoded
stdin against the **published** `@binstruct/arp` while a local `arp/` sat in the
working directory — exit 0, confident output, wrong package. A trailing slash is
what shell tab-completion produces for a directory, so that is the likely way to
type it, not an exotic one. `nested/inner` became `jsr:@binstruct/nested/inner`
the same way.

Two rules survive from the old form, and neither reopens the leak, because both
can only move an input **towards** `path`, while the leak class is a path
falling through to `bare`:

- a leading `.`, which catches `.` and `..` — the only path spellings holding
  neither a `/` nor an extension;
- a JS/TS module extension — `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`,
  `.mjs`, `.cjs`, the whole set the runtime will load, in `isModulePath` — which
  catches `mod.ts` typed from inside its own directory. The list is not what
  decides file from directory, but it is still what the directory refusal offers
  as candidates, so a gap in it hides a real module from the listing.

The classification space is written out as a table of explicit rows in
`specifier.test.ts`: every coordinate shape, every path shape, each with a
trailing slash, plus the empty string, `/`, `.`, `..`, `@` and a scheme-like
input with one leading character. A future gap should show up as a missing row
in an obvious table rather than as a bug in the field.

Two classifications change as a consequence, both towards the grammar.
`@binstruct/png/mod.ts` is a coordinate with a sub-entrypoint rather than a
path, because a leading `@` decides before the extension does; a local file
under a scope directory is reached as `./@binstruct/png/mod.ts`, the same
disambiguation a local `png/` already needed. And `c:/tmp/pkg` is a path rather
than the bare name `jsr:@binstruct/c:/tmp/pkg`, which named nothing anyone could
have meant.

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
(`inspectLocalTarget` in `target.ts`); `isDirectory` refuses, a `NotFound` gets
its own "no such path" message rather than the directory one, and a specifier
that does not parse as a URL at all is `unreadable` rather than an uncaught
`TypeError` — `binstruct "file://a b/x"` used to escape as a stack trace,
because the URL was decoded outside the `try` guarding the `stat`.

Spelling is then irrelevant, but only because **both halves hold**: `./pkg`,
`pkg/`, `/abs/pkg`, `file:///abs/pkg` and a symlink to any of them are one URL
because the table above classifies every one of them as a path or a scheme and
`resolve` normalizes the trailing slash away, and they are one target because
`Deno.stat` follows symlinks. This paragraph asserted the conclusion for three
releases while the first half was false for `pkg/`, which the table sent to the
registry and which therefore reached neither the URL nor the target.

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

"Demonstrably exists" is a claim about the target, on the same argument as the
refusal itself, so **each candidate is stat'ed and kept only if a readable file
is at the far end of it**. `Deno.readDir` reports what it finds without
following links, so a symlink is neither a file nor a directory to it: filtering
on `isDirectory` alone listed a dangling `aaa_link.ts` as a module and — sorting
first — made it the `TRY` line, which then failed with `no such path`, while a
`*.ts` link leading to a directory landed straight back on the directory
refusal. A link that leads to a real module is still listed, because `import()`
follows it too.

Every `TRY` line is **shell-quoted**, by `shellWord` in `guide.ts`. A `TRY` line
is a promise that the command works when pasted, and spaces are ordinary in a
path: `binstruct "./spaced dir"` answered `TRY binstruct ./spaced dir/mod.ts`,
which pastes as two arguments and dies on `no such path: ./spaced`. Only the
words carrying user data are quoted — the redirections and the `<coder>`
metavariable are shell syntax and prose, and quoting either would break the
paste this protects.

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
- **A local directory named like a package is shadowed only while it is spelled
  like a package.** Bare `png` resolves to the JSR package whatever is on disk;
  `./png` and `png/` both name the directory, and then say to name the module
  inside it. Documented in `--help`, not defended against.
- **A local path under a scope directory needs a `./`.** `@binstruct/png/mod.ts`
  is read as a coordinate with a sub-entrypoint, because a leading `@` decides
  before the extension does. This is the same ambiguity as the bare name above
  and takes the same fix. It is inherent to the shorthand: a leading `@` cannot
  mean both things.
- **Classification is now closed, and enumerated.** The rules follow from the
  grammar of a registry coordinate rather than from a list of path spellings, so
  a novel path spelling cannot fall through to the registry; and the space is
  written out row by row in `specifier.test.ts`, so a gap shows up as a missing
  row rather than as silent output from the wrong package.
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
  prefixes out of scope. What follows such a prefix is then classified on its
  own terms, so `c:` is a name and `c:/tmp/pkg` is a path.
- **A `TRY` line may carry quotes.** A path holding a space is rendered
  single-quoted, which is slightly noisier to read and is the only form that
  survives being pasted.
- **The directory listing costs one `stat` per candidate.** Paid only on the
  refusal path, and it is what makes the offered names names that load.

## References

- `specifier.ts` — `resolveSpecifier`, `classify`, `isModulePath`
- `specifier.test.ts` — the enumerated classification space
- `target.ts` — `inspectLocalTarget`, the stat that decides; `modulesInside`
- `guide.ts` — `shellWord`, which makes a `TRY` line pasteable
- `cli.ts` — `directoryGuide`, `missingPathGuide`, where refusal is rendered
- `loader.ts` — `loadCoder`, which receives the specifier to import
- `@binstruct/cli` ADR 0002 — why discovery needs a single-module specifier
- `@binstruct/cli` ADR 0003 — why the implied scope is `@binstruct`
- `@binstruct/cli` ADR 0001 — where resolved and short forms are displayed
