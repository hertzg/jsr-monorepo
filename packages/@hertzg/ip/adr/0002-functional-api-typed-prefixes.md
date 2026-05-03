# ADR 0002 — Functional API with typed name prefixes; no classes

**Status:** Accepted

## Context

With addresses as primitives (ADR 0001), there is no obvious place to
hang methods. The library could still introduce a wrapper class purely
for namespace organization — `Ipv4.parse("…")`, `Ipv4.contains(cidr, ip)`
— but that buys nothing the type system and module system don't already
provide, and it forces consumers through a constructor for every value.

JS module exports plus typed function names give the same discoverability
without the indirection.

## Decision

- **Free functions only.** No classes, no method dispatch, no `this`.
- **Naming pattern:** `<verb><Type>` for version-specific functions —
  `parseIpv4`, `stringifyIpv6`, `cidrv4Contains`, `cidrv4Mask`,
  `classifyIpv6`.
- **Universal helpers** (`parseIp`, `stringifyIp`, `parseCidr`,
  `cidrContainsCidr`, `cidrSize`, `classifyIp`) sit on top of
  version-specific ones and dispatch by `typeof`.
- **Boolean predicates use `is<Cond>`:** `isValidIpv4`, `isIpv4Private`,
  `isCidrv4`, `isIpv6Loopback`. Always return `boolean`; never throw.
- **Submodules group by `<concern>[v4|v6]`:** `ipv4`, `cidrv4`,
  `classifyv4`, `validatev4`, and likewise for v6, plus a universal
  module per concern (`ip`, `cidr`, `classify`, `validate`).

## Consequences

- **Tree-shaking is mechanical.** Importing `parseIpv4` does not pull
  in IPv6 code.
- **The function name encodes both verb and version.** `cidrv4Contains`
  is unambiguous standalone; no `import * as Cidrv4` needed at the call
  site.
- **Universal helpers are a thin dispatch layer.** They exist for
  ergonomics; the v4/v6 versions are the ground truth.
- **Adding a new operation is one export per version plus one
  universal dispatcher** — no class to extend, no interface to keep
  in sync.
- **Consumers can mix per-version and universal calls freely.**

## References

- `ip.ts`, `cidr.ts`, `classify.ts`, `validate.ts` — universal
  dispatchers
- `ipv4.ts`, `ipv6.ts`, `cidrv4.ts`, `cidrv6.ts`, `classifyv4.ts`,
  `classifyv6.ts`, `validatev4.ts`, `validatev6.ts` — version-specific
- Repo ADR 0008 — Named exports; functions over classes
- Repo ADR 0010 — Sub-entrypoint exports per package
