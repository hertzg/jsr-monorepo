# ADR 0002 — Spell the optional endianness as a parameter default, not a `?`

**Status:** Accepted — supersedes the spelling paragraph of ADR 0001

## Context

ADR 0001 made three of this package's four factories reachable as `factory()`,
so that zero-argument tooling — `@binstruct/cli`, issue #219 — could use pcap at
all. It then chose a specific spelling for the optional parameter:

> The optional parameters are spelled with a `?` and an internal
> `?? PCAP_DEFAULT_ENDIANNESS`, rather than as a parameter with a default value.
> The two are identical to a TypeScript caller, but `deno doc --json` reports a
> defaulted parameter as non-optional and a `?` parameter as optional — and
> reachability by `deno doc`-driven tooling is the whole point of the change.

Both halves of that justification are wrong, and the rule it produced caused the
exact failure ADR 0001 was written to fix.

**`deno doc --json` does not report a defaulted parameter as non-optional.** It
reports `kind: "assign"`, and `@binstruct/cli`'s `discover.ts` counts a
parameter as required only when `param.optional !== true` **and** its kind is
outside `NON_REQUIRED_PARAM_KINDS`, which is `{"assign", "rest"}`. A defaulted
parameter therefore yields `requiredParams: 0`, exactly like a `?` parameter.
Measured on both spellings of all three factories.

**`deno doc` is not the only gate.** When the CLI cannot spawn `deno doc`
(discovery denied, no `--allow-run=deno`), it falls back to `Function.length` on
the imported factory. `Function.length` counts a `?` parameter as **1** and a
defaulted parameter as **0**. Under ADR 0001's spelling the real CLI printed:

```
pcapFile was not called: it takes 1 argument at runtime
```

for `pcapFile`, `pcapGlobalHeader` and `pcapRecord` alike. Pcap remained
unreachable from the tool ADR 0001 existed to serve.

## Decision

**Spell an optional coder parameter as a parameter with a default value.** The
`?` form is banned in this package's factory signatures:

```ts ignore
export function pcapGlobalHeader(
  endianness: PcapEndianness = PCAP_DEFAULT_ENDIANNESS,
): Coder<PcapGlobalHeader> {
```

`pcapRecord` takes the identical form. Behaviour is unchanged for every caller;
only `Function.length` moves, from 1 to 0.

**`pcapFile` takes `endianness: PcapEndianness | undefined = undefined`.** It
cannot take a plain default. `undefined` is not an absent value here, it is a
third mode: it selects magic sniffing on decode. Writing
`= PCAP_DEFAULT_ENDIANNESS` would silently destroy sniffing and misdecode every
big-endian capture at exit 0. The explicit `= undefined` gives `.length === 0`
while leaving the `endianness !== undefined` branch — and therefore the
semantics of ADR 0001 — untouched. The signature carries a comment saying so, so
nobody "simplifies" it back.

**`pcapFileWith(headerCoder, recordCoder)` keeps both arguments required**, as
ADR 0001 decided, and its arity stays 2.

The general rule, which explains why `pcapFileWith` is treated differently from
`@binstruct/png`'s `pngFileChunks`: **default a factory's argument when a
correct default exists; keep the argument required when the obvious default
would be silently wrong.** `pngChunkRefined()` is exactly what `pngFile()`
passes, so defaulting it is a synonym. `pcapFileWith(pcapGlobalHeader(),
pcapRecord())` would be `pcapFile("le")`, never `pcapFile()` — it loses sniffing
and misreads big-endian captures without erroring. That asymmetry is principled,
not an oversight.

**The arity is asserted.** `mod.test.ts` asserts `pcapGlobalHeader.length`,
`pcapRecord.length` and `pcapFile.length` are `0`, and `pcapFileWith.length` is
`2`. Without that guard the `?` spelling can return silently — it type-checks,
every existing test passes, and only the CLI notices.

## Consequences

- **Pcap is reachable from zero-argument tooling on both discovery paths**, the
  `deno doc` path and the `Function.length` fallback. ADR 0001's stated goal is
  now actually met.
- **`?` and `=` are no longer interchangeable in this package.** They are
  interchangeable to a TypeScript caller and to `deno doc`; they differ to
  `Function.length`. Anything that reflects over a factory sees the difference.
- **`pcapFile`'s signature is more verbose than it looks like it needs to be.**
  `| undefined = undefined` reads as redundant and is not. The comment on the
  parameter is load-bearing.
- **ADR 0001's Decision stands, its spelling paragraph does not.** The
  three-tier design — sniffing file coder, single-order building blocks,
  argument-taking builder — is unchanged.

## References

- `mod.ts` — `pcapFile`
- `header.ts` — `pcapGlobalHeader`, `PCAP_DEFAULT_ENDIANNESS`
- `record.ts` — `pcapRecord`, `pcapFileWith`
- `mod.test.ts` — `coder factories report an arity of zero`
- ADR 0001 — Zero-argument coder factories (amended by this ADR)
- `@binstruct/cli` `discover.ts` — `NON_REQUIRED_PARAM_KINDS`, the
  `Function.length` fallback
- `@binstruct/png` ADR 0001 — Two-tier coder API
- Issue #219 — `@binstruct/cli` cannot pass arguments to coder factories
