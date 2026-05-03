# ADR 0006 — Classification is total and uses precomputed CIDR constants

**Status:** Accepted

## Context

`classifyIpv4` and `classifyIpv6` classify an address into a well-known
range — private, loopback, link-local, multicast, etc. The library
needs to answer two design questions:

- **Coverage.** Should every address get a label, or can the function
  return `null` / `"unknown"` for addresses that don't match any
  documented range?
- **Range constants.** Should the RFC ranges (`10.0.0.0/8`, `127.0.0.0/8`,
  `fe80::/10`, etc.) be parsed on every call, hardcoded as numeric
  literals, or parsed once at module load?

A total classifier (every input gets exactly one label) is easier to
reason about — callers can switch on the return value without a
default case. Precomputing CIDR constants avoids re-parsing the same
RFC ranges thousands of times.

## Decision

- **Classification is total.** Every IPv4 address falls into exactly
  one `ClassificationIpv4` label; every IPv6 address falls into
  exactly one `ClassificationIpv6`. The "fallback" labels are
  `"public"` for IPv4 and `"global-unicast"` for IPv6 — addresses
  not matching any specific range get the catch-all.
- **Order of checks matters.** More specific ranges are tested
  before more general ones (e.g. `127.0.0.0/8` before the broad
  reserved/public split). The order is part of the implementation
  contract, not just an optimization.
- **RFC range CIDRs are precomputed at module load** using
  `parseCidrv4` / `parseCidrv6` constants:

  ```ts ignore
  const CIDR_PRIVATE_10: Cidrv4 = parseCidrv4("10.0.0.0/8");
  const CIDR_LOOPBACK: Cidrv4 = parseCidrv4("127.0.0.0/8");
  // …
  ```

  Predicates (`isIpv4Private`, `isIpv4Loopback`, …) and the
  classifier dispatcher both consult these constants via
  `cidrv4Contains`.

## Consequences

- **No `null` or `"unknown"` returns from classifiers.** Callers can
  exhaustively switch the result type without a default case.
- **Re-using the constants in tests, predicates, and the classifier**
  keeps the RFC-range vocabulary in one place. Updating a range is a
  single-line change.
- **Module load does work.** Each classifier module parses ~10–14
  CIDRs at import time. This is one-time and tiny relative to typical
  classification volume; it makes per-call classification an
  arithmetic operation.
- **Adding a new classification label is a breaking change to the
  union type** (per repo ADR 0004 / `BREAKING CHANGE:` marker). The
  precomputed constant is a strictly additive change at the source
  level.
- **Order changes are not breaking type-wise but can change
  runtime behavior** for addresses falling into overlapping
  ranges. Treat reordering with care.

## References

- `classifyv4.ts` — `classifyIpv4`, `ClassificationIpv4`,
  precomputed `CIDR_*` constants
- `classifyv6.ts` — `classifyIpv6`, `ClassificationIpv6`
- `classify.ts` — universal `classifyIp`
- ADR 0001 — Numeric representation
