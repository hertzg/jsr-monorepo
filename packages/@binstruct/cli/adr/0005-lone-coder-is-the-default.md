# ADR 0005 — When a package exposes exactly one zero-argument coder, the coder argument may be omitted

**Status:** Accepted

## Context

ADR 0001 makes `<coder>` a required word between the package and the command.
Running the discovery probe of ADR 0002 across every `@binstruct` package shows
how often that word carries information. Zero-argument coders per package:

| count | packages                                                                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | arp, au, bfd, dos-mz, esp, ethernet, icmp, icmpv6, ico, igmp, inet, ipv4, ipv6, mbr, mp3, ntp, pppoe, rtp, sll, sqlite, tar, tcp, tga, tls-record, udp, vlan, vxlan — **27** |
| 3     | bmp, png                                                                                                                                                                     |
| 6     | wav                                                                                                                                                                          |
| **0** | pcap                                                                                                                                                                         |

For 27 of 31 packages the word is pure ceremony: there is exactly one thing it
could name, and the user must nonetheless look it up, because names like
`arpData`, `ustarHeader` and `sllHeader` are not guessable from the package
name.

## Decision

When discovery finds **exactly one** coder with no required parameters,
`<coder>` may be omitted:

```
binstruct arp decode < arp.bin > arp.json
```

Consequences for the disclosure levels of ADR 0001: level 1 collapses into
level 2. Bare `binstruct arp` names the single coder, notes that it may be
omitted, and offers the commands directly, with a `TRY` line that skips the
coder word.

`decode` and `encode` are **reserved in the second positional**. If the second
word matches a command name it is the command, and the coder is inferred. A
coder actually named `decode` or `encode` is therefore unreachable by that
shorthand; this is documented, not defended against.

The inference is always announced on **stderr**, in the short form of ADR 0004,
since the header one line above has already paired that form with the resolved
specifier:

```
package: arp → jsr:@binstruct/arp
using coder: arpData (only coder in arp)
```

The default applies only at exactly one candidate. Two or more — `png`, `bmp`,
`wav` — always require the explicit name, with no notion of a privileged or
"main" coder.

## Consequences

- **The ceremony disappears for 87% of packages**, including every network
  protocol package, which is where the CLI gets most of its use.
- **The shortcut is never silent.** The inferred name goes to stderr on every
  run, so a script's log shows which coder actually ran and the redirect stays
  clean.
- **The set of commands is now load-bearing vocabulary.** Adding a third command
  later shadows any coder sharing its name. Command names must stay few and
  verb-shaped.
- **Availability of the shortcut depends on a package's exports.** Adding a
  second zero-argument coder to `@binstruct/arp` would break
  `binstruct arp decode` for existing users — a breaking change in the CLI
  caused by a feature addition elsewhere. Format packages need to know this.
- **It rests on discovery.** Unlike specifier resolution (ADR 0004), the
  shortcut cannot work when `deno doc` is unavailable, so the failure path must
  fall back to demanding an explicit coder name.
- **`pcap` is unreachable regardless.** Its coders all take required arguments,
  and the CLI has no way to supply one. Naming one explicitly is refused for the
  same reason: `binstruct pcap pcapFile decode` would otherwise call
  `pcapFile()` and let `endianness` default, turning a little-endian capture
  into plausible, wrong numbers with exit 0. Refusal is what ADR 0002's
  always-on discovery is for.

## References

- `@binstruct/cli` ADR 0001 — the positional contract being relaxed
- `@binstruct/cli` ADR 0002 — the probe supplying the candidate set
- `@binstruct/pcap` — `pcapFile(endianness)`, the zero-candidate case
