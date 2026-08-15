# ADR 0008 — Non-contiguous network masks throw

**Status:** Accepted

## Context

`cidrv4MaskToPrefixLength` / `cidrv6MaskToPrefixLength` (issue #264)
invert `cidrv4Mask` / `cidrv6Mask`: they take a network mask and
return the prefix length that produces it. Not every mask has one.
`255.255.255.0` is `/24`, but `0xFF00FF00` is not a CIDR mask at all —
its one bits are not contiguous from the top, so no prefix length
produces it.

The ecosystem is split on how to report that:

- **ipaddr.js** returns `null` from `prefixLengthFromSubnetMask()`
  and declares `number | null` in its `.d.ts`.
- **ip-address** and **netmask** throw.
- **node-ip** returns a silently wrong answer — it counts *set bits*
  (`255.0.255.0` → `16`) rather than *leading* ones, and every derived
  value (last address, host count) is then nonsense.

Only the last of these is clearly wrong. The choice between `null` and
a throw was argued at length on #264 and PR #270, and `null` was
carried first. It does not survive comparison with the rest of the
package.

## Decision

**A non-contiguous mask throws `TypeError`.** The return type is
`number`, not `number | null`.

Both functions therefore throw for two distinct reasons, the same
split `parseCidrv4` already uses for format versus range:

| Input                | Error        | Why                                  |
| -------------------- | ------------ | ------------------------------------ |
| `0xFF00FF00`         | `TypeError`  | a 32-bit value, but not a mask shape |
| `-1`, `0x100000000`  | `RangeError` | not a 32-bit unsigned integer        |
| `1.5`, `NaN`         | `RangeError` | not an integer                       |

The message names the offending value —
`IPv4 mask is not contiguous: 0xff00ff00` — so the failure is
diagnosable from a log line alone.

## Why not `null`

Four arguments, in the order they bite:

1. **It contradicts `parseIpv4`.** `parseIpv4("256.0.0.0")` throws
   `RangeError` even though `"256.0.0.0"` is a perfectly good
   `string` — because the function's domain is "strings denoting an
   address", not "strings". Read the same way, the mask functions'
   domain is "numbers denoting a contiguous mask", not "32-bit
   numbers", and the answer is a throw. Choosing the wider domain for
   masks and the narrower one for addresses was a free choice
   presented as a forced one.

2. **`cidrv4Intersect` is not the precedent it looked like.** It
   returns `null` for two *valid* CIDR blocks that happen not to
   overlap; "empty" is a legitimate answer about legitimate inputs. A
   non-contiguous mask is not a legitimate input, so the analogy does
   not hold.

3. **The package already has a non-throwing path, and it is not
   `| null`.** `parseIpv4` throws and `isValidIpv4` wraps it in
   try/catch to return a boolean. That pair is this package's answer
   to "let me check without crashing". A `| null` return introduces a
   second, competing mechanism for a solved problem. If a predicate
   is ever wanted here it belongs in `validatev4.ts` as
   `isValidCidrv4Mask`, matching the existing shape.

4. **`null` is trivially silenced into the bug it was meant to
   prevent.** `?? 32` turns a broken mask into a host route, `?? 0`
   into the whole internet, `!` into a `null` that surfaces later and
   further away. All are one keystroke. A throw cannot be defaulted
   away by accident. "The compiler forces the caller to handle it"
   was overstated: it forces the caller to *notice* it.

There is also a smaller tell. Every `null`-returning example written
for these functions converted the `null` straight into a throw on the
next line. When every caller writes the same two lines, the library
should write them once.

## Consequences

- **Consistent with the rest of the package.** Bad input throws,
  everywhere, with no exception to learn.
- **Call sites get shorter.** `{ address, prefixLength:
  cidrv4MaskToPrefixLength(mask) }` needs no null check.
- **Two error types from one function** — `TypeError` for shape,
  `RangeError` for range. Matches `parseCidrv4`; callers who don't
  care can catch `Error`.
- **Migrating ipaddr.js users get an exception where they expected
  `null`.** They are the minority: two of the three sane
  implementations throw. The change is loud, not silent.
- **`cidrv4Intersect` / `cidrv6Intersect` / `cidrIntersect` keep
  returning `null`.** Their `null` means "no overlap between two
  valid blocks", which this ADR does not touch. This ADR is about
  invalid input only, and deliberately does not generalize into a
  package-wide `null`-versus-throw rule.
- **A non-throwing predicate can still be added later** as
  `isValidCidrv4Mask` in `validatev4.ts`, without changing these
  signatures.

## Notation input

Both functions accept the mask either as a number (`bigint` for v6) or
as a notation string — `"255.255.255.0"`, `"ffff:ffff::"`. The string
form parses with `parseIpv4` / `parseIpv6` internally and then applies
the contiguity rule above.

This is the one place a mask *should* be parsed from text. A network
mask is not an address (see `CONTEXT.md`), so calling `parseIpv4` at a
call site to manufacture a mask reads as the wrong tool — but calling
it *inside* a function named for masks is an implementation detail, and
it is the only place that can also reject `"255.0.255.0"`. A general
`parseDottedDecimal` could not: it has no way to know a mask was
intended.

Consequently the errors compose. Malformed notation surfaces
`parseIpv4`'s own errors unchanged (`TypeError` for shape, `RangeError`
for octet range); a well-formed string that is not a mask gets the
`TypeError` above.

## References

- `cidrv4.ts` — `cidrv4Mask`, `cidrv4MaskToPrefixLength`
- `cidrv6.ts` — `cidrv6Mask`, `cidrv6MaskToPrefixLength`
- `validatev4.ts` — `isValidIpv4`, the throwing-parser + predicate pair
- ADR 0005 — Cross-version CIDR operations throw `TypeError`
- Repo ADR 0006 — No defensive programming
- Issue #264, PR #270
