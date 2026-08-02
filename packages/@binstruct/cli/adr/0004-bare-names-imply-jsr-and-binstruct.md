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
| `jsr:@binstruct/png`, `npm:x`, `https://…` | known scheme | unchanged               |
| `@hertzg/xhb`, `@binstruct/png/sub`        | starts `@`   | `jsr:@hertzg/xhb`       |
| `./x`, `/abs/x`, `pkg/`, `a/b`, `mod.ts`   | is a path    | `file://` URL under cwd |
| `png`, `wav@0.2.0`                         | bare         | `jsr:@binstruct/png`    |

Resolution is a pure function of the input string and the working directory.
What is at the far end of a `file:` URL is a separate question, asked afterwards
and answered by the filesystem, not by the table.

**Both explicit rules are closed sets, and everything left over is a path.**

**A scheme is one of five**, the schemes a coder package can live behind:
`jsr:`, `npm:`, `http:`, `https:`, `file:`. Membership, not a pattern, and
case-sensitive.

The rule was `^[a-z][a-z0-9+.-]+:` — any word of two or more lowercase
characters before a colon — and it leaked in exactly the way the coordinate rule
below had leaked. `my:dir/mod.ts` is an ordinary relative path whose first
segment holds a colon, and it matched: classified `scheme`, it was passed
through **unanchored** to the working directory and **never stat'ed**, while
`deno doc` resolved it against the working directory as the path it plainly is.
Discovery listed the local module and `import()` then looked for `my:dir/mod.ts`
next to the CLI's own sources. That is the discovery-versus-execution divergence
this ADR spent four revisions closing, in one more spelling, and it came from
the same mistake: an open predicate over an unbounded space of spellings leaks,
an explicit set does not.

The order cannot be fixed by reordering — `https://example.com/mod.ts` contains
a `/`, so the scheme test has to run first. Closing it is the only move.
Anything else carrying a colon now falls through to the `/` rule and becomes a
path, which is what `deno doc` already thought it was; a colon with no slash
(`gopher:x`, `ab:x`, `c:`) falls all the way through to a bare name, as `c:`
always did.

`node:` and `data:` are **not** in the set, though `import()` resolves both.
They were, on the reasoning that a specifier is what `import()` takes — the
wrong question. The set is the schemes a _package_ can be hosted at, and neither
hosts one: `node:` names a runtime built-in and `data:` carries inline source.
Admitting them bought nothing and cost the divergence a third time, because the
two consumers read them differently: `deno doc` resolves a positional `node:…`
against the working directory, `import()` treats it as a built-in. A local file
named `node:evil.ts` was therefore discovered on disk, announced its coder, and
died in `No such built-in module: node:evil.ts` — discovery and execution
looking at two different things, which is the failure this table exists to make
impossible.

Out of the set, each falls where it belongs. `node:fs` and `node:dir` hold no
slash and no module extension, so they are bare names, expand to
`jsr:@binstruct/node:fs` and miss in the registry. `node:evil.ts` ends in a
module extension, so it is the local file it is. `data:text/plain,x` holds a
slash, so it is a path. Three clean refusals — or, in the third case, the right
answer — in place of one divergence.

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
`specifier.test.ts`: every scheme in the set, every coordinate shape, every path
shape, each with a trailing slash, plus the empty string, `/`, `.`, `..`, `@`, a
drive prefix, an uppercase scheme and an unknown one with and without a slash. A
future gap should show up as a missing row in an obvious table rather than as a
bug in the field.

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
which pastes as two arguments and dies on `no such path: ./spaced`. **The
redirections are the only shell syntax a `TRY` line carries, and the only part
of it left bare.**

A **metavariable is not an exception to that**, though it was written as one.
The escape-hatch line of a failed listing is the one suggestion the CLI cannot
finish — the missing word is the word it could not look up — so it leaves
`<coder>` for the user, and `<coder>` is an input redirection to a shell. The
promised `binstruct png <coder> decode < input.bin > output.json5` pasted back
as `binstruct png decode` reading a file called `coder`: a different command,
silently, and one that can exit 0. It was exempted from `shellWord` as prose; it
is not prose, it is a word the user is meant to replace. `metavariable` in
`guide.ts` renders it quoted, so the shell hands it on whole and the CLI refuses
it by name — the worst a line nobody edited should do. Nothing else the CLI
prints may carry shell syntax outside a redirection, and `cli.test.ts` scans the
`TRY` lines of every screen that prints one, the failed listing included, rather
than trusting the call sites.

Surviving the shell is half of it: the line then has to survive **this CLI's own
argument parsing**, which `shellWord` knows nothing about. A module file may be
called `-dash.ts`, and the refusal above offers whatever names are in the
directory — so `TRY binstruct -dash/mod.ts` pasted back as the flag cluster
`-d -a -s -h`, whose `h` is `--help`, and printed the help screen at exit 0
instead of decoding. Any `TRY` line whose package word starts with `-` is
therefore written with the `--` separator in front of it (`packageWord` in
`cli.ts`, ADR 0001). Only the package word needs it, because it is the first
positional and the separator covers everything after it, and because a coder or
command name comes from discovery and is an identifier.

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
- **Classification is now closed, and enumerated.** Both explicit rules are
  finite sets — five schemes, five coordinate shapes — rather than patterns over
  the ways a path can be spelled, so a novel path spelling can fall through to
  neither the registry nor the pass-through; and the space is written out row by
  row in `specifier.test.ts`, so a gap shows up as a missing row rather than as
  silent output from the wrong package.
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
- **A scheme the runtime resolves but no package lives at is refused, not
  followed.** `binstruct node:fs` is a registry miss and `binstruct data:…` is a
  path that is not there. Both used to be passed through to `import()` on the
  strength of a `deno doc` run that had read something else entirely. A refusal
  naming what was typed is the worst case; the alternative was the wrong module
  loading under the right name.
- **A scheme outside the set is not a scheme.** Anything else with a colon is
  classified on its own terms, so `c:` and `gopher:x` are names, `c:/tmp/pkg`
  and `my:dir/mod.ts` are paths, and `JSR:@binstruct/png` — membership is
  case-sensitive — is one too. Adding a scheme the runtime learns to resolve is
  a one-line change plus a row in the table; the cost of missing one is a
  refusal naming the specifier, not a wrong-package decode.
- **A `TRY` line may carry quotes, and may carry `--`.** A path holding a space
  is rendered single-quoted; a package word starting with `-` is preceded by the
  end-of-flags separator, since a module file may be called `-dash.ts` and the
  refusal above is what offers its name; and a placeholder is quoted as
  `'<coder>'`, since bare it is a redirection. All three are noisier to read and
  all three are the only forms that survive being pasted (ADR 0001).
- **The directory listing costs one `stat` per candidate.** Paid only on the
  refusal path, and it is what makes the offered names names that load.

## References

- `specifier.ts` — `resolveSpecifier`, `classify`, `MODULE_SCHEMES`,
  `isModulePath`
- `specifier.test.ts` — the enumerated classification space
- `target.ts` — `inspectLocalTarget`, the stat that decides; `modulesInside`
- `guide.ts` — `shellWord`, which makes a `TRY` line survive the shell;
  `metavariable`, which makes a placeholder survive it too
- `cli.ts` — `packageWord`, which makes it survive this CLI's own parser;
  `directoryGuide`, `missingPathGuide`, where refusal is rendered
- `loader.ts` — `loadCoder`, which receives the specifier to import
- `@binstruct/cli` ADR 0002 — why discovery needs a single-module specifier
- `@binstruct/cli` ADR 0003 — why the implied scope is `@binstruct`
- `@binstruct/cli` ADR 0001 — where resolved and short forms are displayed
