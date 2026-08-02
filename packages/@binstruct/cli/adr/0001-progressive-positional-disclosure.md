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
binstruct [<package> [<coder> [<command>]]] [options]
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

## References

- `cli.ts` — `parseCliArgs`, `planCli`, `present`
- `guide.ts` — `renderGuide`, the one renderer all three levels share
- `@binstruct/cli` ADR 0002 — coder discovery via `deno doc --json`
- `@binstruct/cli` ADR 0003 — the bundled package registry
- `@binstruct/cli` ADR 0004 — bare names imply `jsr:` and `@binstruct`
- `@binstruct/cli` ADR 0005 — a lone zero-arg coder is the default
