# ADR 0001 — Zero-argument coder factories: `pcapFile()` sniffs the magic, the building blocks default to little-endian

**Status:** Accepted — the spelling paragraph below (`?` over a parameter
default) is superseded by ADR 0002, which records why it was wrong and what
replaced it. Every other decision here stands.

## Context

Every coder factory this package exported required an `endianness` argument.
That made `@binstruct/pcap` the only `@binstruct/*` package with no coder
reachable as `factory()` — awkward for humans who just want to read a capture,
and fatal for tooling that can only call a factory with no arguments (see issue
#219, where `@binstruct/cli` cannot pass arguments at all and pcap is therefore
unusable from it).

Pcap is unusual among the formats in this scope: byte order is not fixed by the
specification. Both little- and big-endian captures are valid, and the file
announces which it is via the magic number at offset zero (`0xa1b2c3d4` read in
the file's own order, `0xd4c3b2a1` byte-swapped). So on **decode** the correct
answer is discoverable from the data. On **encode** there is nothing to inspect
and a value must simply be chosen.

The obvious composition — `struct({ magic, …rest })` where `rest` picks its
coders based on the decoded `magic` — is not expressible. `ref`/`computedRef`
resolve _values_ from earlier fields (binstruct ADR 0003), not _coders_;
`refineSwitch` dispatches only after its base coder has already decoded the
whole host (binstruct ADR 0005), which requires the base to be
endianness-agnostic, which the pcap layout is not; `lazy`'s factory takes no
context, so it cannot see decoded bytes. There is no "select the coder for the
remaining fields from an earlier field's value" primitive.

## Decision

Three changes, all additive — passing an argument behaves exactly as before.

**`pcapFile(endianness?)` resolves byte order per operation.** Given an argument
it is the fixed-order coder it always was. Given none it returns a coder that,
on decode, reads the magic with `detectPcapMagic` and delegates to a little- or
big-endian `pcapFileWith` pair accordingly — header _and_ records switch
together, so the file stays internally coherent. On encode it writes
`PCAP_DEFAULT_ENDIANNESS`. A buffer with no recognised magic decodes as
`PCAP_DEFAULT_ENDIANNESS` rather than throwing (repo ADR 0006).

This coder is hand-written against the public `Coder` protocol rather than
composed from primitives. Binstruct ADR 0001 sanctions exactly this — "the shape
is the contract" — and it uses only exported API (`Coder`, `kCoderKind`,
`createContext`, `refSetValue`). It reaches into nothing private.

**`PCAP_DEFAULT_ENDIANNESS` is `"le"`, and is exported.** libpcap writes host
order, and every mainstream capture host is little-endian. Naming the constant
means the default is a documented part of the API that callers can assert
against, not a literal buried in a signature.

**`pcapGlobalHeader(endianness?)` and `pcapRecord(endianness?)` default to that
constant and stay single-order.** A record carries no magic, so its byte order
is recoverable only from the header that precedes it — a self-sniffing
`pcapRecord()` is impossible. Making `pcapGlobalHeader()` sniff while
`pcapRecord()` could not would let
`pcapFileWith(pcapGlobalHeader(), pcapRecord())` decode a big-endian header and
then little-endian records, silently. Auto-detection therefore lives only at the
tier that owns the whole file.

**`pcapFileWith(headerCoder, recordCoder)` keeps both arguments required.** It
is the builder tier, exactly analogous to `@binstruct/png`'s
`pngFileChunks(chunkCoder)`, and `png` ADR 0001 already settled that a builder
may require arguments when a zero-argument sibling covers the common case.
`pcapFile()` is that sibling.

The optional parameters are spelled with a `?` and an internal
`?? PCAP_DEFAULT_ENDIANNESS`, rather than as a parameter with a default value.
The two are identical to a TypeScript caller, but `deno doc --json` reports a
defaulted parameter as non-optional and a `?` parameter as optional — and
reachability by `deno doc`-driven tooling is the whole point of the change.

## Consequences

- **Pcap is reachable from zero-argument tooling.** Three of four factories now
  call bare, the same ratio as `png`.
- **`pcapFile()` reads big-endian captures with no configuration**, which no
  previous call could do without a `detectPcapMagic` probe first.
- **Encode is asymmetric with decode.** `pcapFile()` round-trips any input, but
  re-encoding a big-endian capture through the zero-argument coder emits
  little-endian. Callers preserving on-disk byte order must pass the endianness
  explicitly.
- **One coder in this package is not pure composition.** It must be maintained
  by hand if the `Coder` protocol changes.
- **The gap is recorded, not worked around.** If binstruct ever grows a
  primitive that selects a coder from an earlier decoded field, this coder
  should be rewritten in terms of it.

## References

- `mod.ts` — `pcapFile`
- `header.ts` — `PCAP_DEFAULT_ENDIANNESS`, `pcapGlobalHeader`, `detectPcapMagic`
- `record.ts` — `pcapRecord`, `pcapFileWith`
- ADR 0002 — Parameter defaults over optional marks (amends this ADR)
- `@binstruct/png` ADR 0001 — Two-tier coder API
- `@hertzg/binstruct` ADR 0001 — Coder protocol
- `@hertzg/binstruct` ADR 0003 — Refs resolve values, single-pass forward-only
- `@hertzg/binstruct` ADR 0005 — `refineSwitch` dispatches on a host field
- Repo ADR 0006 — No defensive programming
- Issue #219 — `@binstruct/cli` cannot pass arguments to coder factories
