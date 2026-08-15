# ADR 0014 — Reverse DNS names are produced for addresses only, and are relative

**Status:** Accepted

## Context

A reverse DNS name is a fixed transformation of an address: the four IPv4
octets reversed under `in-addr.arpa` (RFC 1035 §3.5), or all 32 IPv6
nibbles reversed under `ip6.arpa` (RFC 3596 §2.5). The package had
nothing for it.

The assembly is six lines. What needed deciding first is the surface
around it.

**Whether the name is absolute.** Go's `net.reverseaddr` returns
`".in-addr.arpa."` and `"ip6.arpa."`, dot included. Python omits it.
Both are defensible: the trailing dot makes the name absolute, so a
resolver search list can never append to it. Measured against Deno,
`Deno.resolveDns` resolves `"8.8.8.8.in-addr.arpa"` and
`"8.8.8.8.in-addr.arpa."` identically, so on the runtime this package
targets the distinction costs nothing either way.

**Where the IPv6 nibbles come from.** The obvious route was `expandIpv6`,
which already produces the uncompressed form the reversal needs. It takes
a **string**, and the value in hand is a `bigint`. Reaching it means
`stringifyIpv6` then `expandIpv6` — which re-parses the string just
built — to recover nibbles that were in the argument all along.

That exposed a real gap. The package had three of the four IPv6
formatting cells filled:

|                 | → compressed   | → expanded   |
| --------------- | -------------- | ------------ |
| from `bigint`   | `stringifyIpv6`| **missing**  |
| from `string`   | `compressIpv6` | `expandIpv6` |

## Decision

**Three functions, addresses only, in their own module.** `arpa.ts`
holds `ipv4ToArpa`, `ipv6ToArpa` and `ipToArpa`, exported as `./arpa`.
The `To<TargetForm>` shape is `ipv4ToBytes` / `ipv6ToBytes` /
`ipToBytes`, which is the closest existing precedent; a separate module
follows ADR 0012's reasoning that a concern is what a reader navigates
by, and `version.ts` already shows a two-function entrypoint is normal
here.

**No prefix or zone form.** No caller has asked for one. If it is ever
wanted it takes its own name and its own issue.

**No inverse direction.** `arpaToIpv4` is parseable and unambiguous, but
nothing in this package parses DNS names, and the inverse drags in a
validation surface — case folding, optional trailing dot, wrong suffix,
wrong label count, non-hex nibbles — with no use case pulling on it.

**The name is relative: no trailing dot.** Every other stringifier here
emits a bare canonical form and no DNS wire-format framing, and the
trailing dot is exactly such framing. Callers handing the name to a
resolver that needs an absolute name append `"."`. The JSDoc on all three
functions states this.

**`stringifyIpv6Expanded(address: bigint): string` fills the matrix
cell**, and `expandIpv6` becomes its composition with `parseIpv6` —
the exact mirror of `compressIpv6`, whose JSDoc already describes itself
as parsing and re-stringifying. `ipv6ToArpa` reads its nibbles back off
`stringifyIpv6Expanded` rather than carrying a second nibble loop.

**`ipToArpa` takes a single `Address` signature, not an overload trio.**
`stringifyIp` is the only same-return-type trio in the package and it
narrows nothing, all three arms returning `string`. `ipToBytes`,
`stringifyCidr` and `cidrContains` all take a plain union with one
signature. `classifyIp`'s trio is not a counterexample: its return type
genuinely varies across the arms.

## Consequences

- **Reusing the formatter costs 1.38x, and it is bought deliberately.**
  On an M2 Pro, Deno 2.9.5, ns per call for `ipv6ToArpa`:

  | route | ns | |
  | --- | --- | --- |
  | 8 bigint group extracts, nibbles peeled with 32-bit `number` ops | 585 | 1.00 |
  | read back off `stringifyIpv6Expanded` | 806 | 1.38x |
  | 32 bigint nibble shifts | 1100 | 1.88x |

  The chosen route is the middle one. The fastest keeps a second copy of
  the nibble arithmetic, and one extraction site was judged worth 220 ns
  on a call that ends in a network round trip regardless.

  The slowest row is the one worth recording: shifting nibbles straight
  off the `bigint` *looks* like the direct route and is the worst of the
  three, because 32 `BigInt(i * 4)` conversions cost more than the string
  work they avoid. This is ADR 0012's finding again — bigint operand
  count is what costs, and `number` bitwise ops are nearly free.

- **`ipToArpa` sees an IPv4-mapped address as IPv4**, because ADR 0004
  has `parseIp` unwrap it before this function is reached. That is not a
  decision this ADR makes or needs to revisit: a function taking an
  `Address` dispatches on `typeof`, and what produced the value is the
  caller's business. `ipToBytes` has the same property. Callers wanting
  the `ip6.arpa` name of a mapped address hold the `bigint` — via
  `parseIpv6` — and call `ipv6ToArpa`.

- **`expandIpv6` keeps its signature and its behaviour**, and loses its
  own loop. Its tests are unchanged; `stringifyIpv6Expanded` gets its own.

- **The relative name is a documented default, not a limitation.** Both
  forms are one character apart and neither is hard to reach from the
  other. What matters is that the JSDoc says which one is returned, so
  callers are not left comparing against Go's output and finding an
  off-by-one-character mismatch.

## References

- `arpa.ts` — `ipv4ToArpa`, `ipv6ToArpa`, `ipToArpa`
- `ipv6.ts` — `stringifyIpv6Expanded`, `expandIpv6`, `compressIpv6`
- RFC 1035 §3.5 — `in-addr.arpa`
- RFC 3596 §2.5 — `ip6.arpa`
- ADR 0004 — universal parsers auto-unwrap IPv4-mapped IPv6; the arpa
  functions inherit that and do not re-litigate it
- ADR 0012 — per-concern modules, and bigint operand cost
- Repo ADR 0010 — sub-entrypoint exports per package
