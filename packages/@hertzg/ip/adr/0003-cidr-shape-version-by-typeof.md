# ADR 0003 — `Cidrv4` / `Cidrv6` are plain objects; version is read from `typeof address`

**Status:** Accepted

## Context

A CIDR block is an `(address, prefix length)` pair. Common
representations:

- A wrapper class with a constructor.
- A discriminated union with an explicit `kind: "v4" | "v6"` tag.
- A tuple `[address, prefixLength]`.
- A plain object `{ address, prefixLength }` where the address type
  carries the version.

ADR 0001 already commits to `number` for IPv4 addresses and `bigint`
for IPv6 addresses, so the version is implicit in the address field.
Adding an explicit `kind` tag would duplicate information already
encoded in the type system.

## Decision

`Cidrv4` and `Cidrv6` are plain readonly objects:

```ts
type Cidrv4 = { readonly address: number; readonly prefixLength: number };
type Cidrv6 = { readonly address: bigint; readonly prefixLength: number };
type Cidr   = Cidrv4 | Cidrv6;
```

Type guards discriminate by `typeof address`:

```ts
function isCidrv4(cidr: Cidr): cidr is Cidrv4 {
  return typeof cidr.address === "number";
}
function isCidrv6(cidr: Cidr): cidr is Cidrv6 {
  return typeof cidr.address === "bigint";
}
```

No `kind` field, no class, no constructor. `parseCidrv4` and
`parseCidrv6` return object literals.

## Consequences

- **Structurally typed.** Anything with the right shape is a CIDR;
  no instanceof check, no factory required.
- **JSON round-trips for IPv4** without a custom serializer
  (`{ address: 167772160, prefixLength: 8 }`). IPv6 still needs
  `stringifyCidrv6` to handle the bigint.
- **Type guards never lie** as long as the address type itself is
  honest — there is no separate kind that could disagree with
  the address.
- **Universal CIDR functions dispatch via `isCidrv4` / `isCidrv6`.**
  See ADR 0005 for what happens on cross-version inputs.
- **Adding fields is a breaking change.** The shape is the contract;
  consumers may destructure or shallow-clone.

## References

- `cidrv4.ts`, `cidrv6.ts` — `Cidrv4`, `Cidrv6`, `parseCidrv4`,
  `parseCidrv6`
- `cidr.ts` — `Cidr`, `isCidrv4`, `isCidrv6`
- ADR 0001 — Numeric representation
- ADR 0005 — Cross-version CIDR operations throw `TypeError`
