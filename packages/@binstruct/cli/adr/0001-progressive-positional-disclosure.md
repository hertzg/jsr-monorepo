# ADR 0001 — Every argument prefix is a valid command that describes the next word

**Status:** Accepted — implemented

> Implemented. `parseCliArgs` fills the three positionals in order, `planCli`
> turns any prefix of them into a plan, and `renderGuide` prints the three
> blocks; ADRs 0002–0005 record the mechanisms it rests on.

## Context

The CLI takes three values before it can do anything: a package, a coder within
that package, and a command. All three must be known in advance. Nothing in the
tool tells you what any of them can be — `--help` shows `jsr:@binstruct/png` and
`pngFile` as examples and stops there. To find a second coder you leave the
terminal and read the JSR docs page.

That is the wrong shape for a tool whose whole subject matter is a registry of
30+ format packages, each exporting coders whose names you cannot guess
(`arpData`, `ustarHeader`, `bitmapInfoHeader`).

The obvious fix — an interactive picker with arrow keys — is worse. It breaks
the pipeline usage that is the tool's entire point
(`… decode < input.png > out.json`), it needs a TTY, and it cannot be pasted
into a script or a README.

## Decision

The argument list is a **prefix chain**, and every prefix of it is a valid
invocation:

```
binstruct [--] [<package> [<coder> [<command>]]] [options]
```

When the next positional is missing, the CLI prints three blocks and stops:

- **`NEXT`** — the name of the missing word and one line on what it means.
- **an options block** — the legal values, discovered from what was already
  typed (ADRs 0002 and 0003), each with its one-line doc.
- **`TRY`** — a complete, paste-ready command line one step further along.

The three levels are:

| typed                   | missing     | options from           |
| ----------------------- | ----------- | ---------------------- |
| `binstruct`             | `<package>` | bundled registry       |
| `binstruct png`         | `<coder>`   | `deno doc --json`      |
| `binstruct png pngFile` | `<command>` | static: decode, encode |

**An incomplete invocation is an error.** Guidance goes to **stderr** and the
process exits **1**. `--help` prints the same material to **stdout** and exits
**0**. There are no exceptions to this rule — not for the bare `binstruct`
invocation, not for a TTY check.

Discovery output never goes to stdout. Stdout carries the payload and nothing
else.

**Help on stdout at exit 0 is the answer to `--help` and to nothing else.** Two
routes reached it without one being asked for, and both are closed here.

**`--` ends the flags.** Everything after it fills a positional slot, whatever
it starts with. Without the separator, `binstruct -dash/ decode` — a directory
called `-dash`, which is a legal name and which shell tab-completion will type
for you — parsed as the flag cluster `-d -a -s -h`, whose `h` is `--help`; the
CLI printed the whole help screen **on stdout, at exit 0**, having decoded
nothing, and `binstruct -dash/ decode > out.json5` filled the redirect with it.
The `TRY` lines follow the same rule: a suggestion whose package word starts
with `-` is written with the separator, so pasting it back runs the command it
promises (`packageWord` in `cli.ts`, ADR 0004).

**An argument the parser cannot use is refused, not ignored.** Three shapes
qualify, and they share a screen — the level 0 guidance, the flag list from
`--help` as its footer, and the notes naming what was not understood — because
they share a consequence: what was typed is not what the CLI would act on. All
three are checked before `--help` and `--version`, since a version banner for a
command line the parser did not understand reports success for one that failed.

- **An unrecognised flag.** Only `-p/--package`, `-c/--coder`, `--docs`,
  `-h/--help` and `-v/--version` exist. Anything else consumes a word — its
  value — and every positional behind it shifts, so
  `binstruct --format png
  decode` read `decode` as the package and answered
  confidently about `jsr:@binstruct/decode`.
- **A blank word.** `binstruct "" decode` did the same thing by a quieter route:
  the blank was filtered out of the positional list before the slots were
  filled, `decode` slid into the package slot, and the CLI reported on
  `jsr:@binstruct/decode` again. `-p ""` did it too, and
  `binstruct png ""
  decode` ran an inferred decode nobody had asked for. **A
  blank word is an argument**: it occupies the slot it was typed into — which is
  the only way the words after it keep the meaning they were typed with — and is
  then refused by the name of that slot. Blank-means-missing was a convenience
  that cost the same shift the flag rule had just closed.
- **A word past the third.** There are three slots and no fourth, and an extra
  positional used to be discarded where it stood.
  `binstruct arp arpData decode
  input.bin` — the `<` forgotten — sat waiting
  on the terminal for the bytes in the file it had just dropped, with nothing on
  the screen to say so. The refusal names the words it could not place and, when
  there is exactly one and the three slots before it are usable, offers the
  redirection that was probably meant:
  `TRY binstruct arp arpData decode < input.bin`. Two extra words are anyone's
  guess, so that screen says what happened and offers nothing.

Each refusal goes to stderr, exits 1 and leaves stdout untouched, like every
other diagnostic.

## Consequences

- **A half-typed command cannot corrupt a redirect.** `binstruct png > out.json`
  fails loudly and leaves `out.json` empty, instead of writing a help screen
  into it.
- **The tool teaches itself.** Each level ends with the next command, so a user
  who knows only `binstruct` reaches a working decode in three keystroke rounds
  without leaving the terminal.
- **One renderer, three levels.** The blocks are identical in shape; only the
  source of options differs. Adding a fourth level later costs a lookup
  function, not a new UI.
- **`--help` output and error output share a code path**, so they cannot drift.
- **The flag form (`-p`, `-c`) is now the odd one out.** It keeps working, but
  every example and error message teaches positionals. Whether it gets a
  deprecation notice is deliberately left open.
- **Exit 1 on bare `binstruct` will surprise someone.** It is the price of the
  no-exceptions rule, and it is what makes the redirect guarantee above
  unconditional.
- **A package name starting with `-` costs one separator**, and the tool teaches
  it: `--help` lists it and every affected `TRY` line carries it. The
  alternative — guessing that a word which parses as flags was meant as a path —
  is the kind of opinion only this CLI would hold, and ADR 0004 records where
  that leads.
- **A mistyped flag now fails instead of nearly working.** It used to run
  something; it now names the flag and stops. This is louder, and it is the only
  way the word in the package slot is the word that was typed.
- **A blank argument is louder than it was, and `binstruct -p` no longer opens
  the package screen** — it says `<package>` is blank. Both are the price of the
  rule that a word the user typed never changes what the words after it mean.
- **A fourth positional fails instead of vanishing.** Anyone who was passing an
  input file as an argument and getting an empty read now gets told why.

## References

- `cli.ts` — `parseCliArgs`, `planCli`, `present`, `unusableArgumentGuide` and
  the three refusals built on it, `packageWord`
- `guide.ts` — `renderGuide`, the one renderer all three levels share
- `@binstruct/cli` ADR 0002 — coder discovery via `deno doc --json`
- `@binstruct/cli` ADR 0003 — the bundled package registry
- `@binstruct/cli` ADR 0004 — bare names imply `jsr:` and `@binstruct`
- `@binstruct/cli` ADR 0005 — a lone zero-arg coder is the default
