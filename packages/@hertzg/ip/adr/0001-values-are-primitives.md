# ADR 0001 - Values are primitives

An IPv4 address is a `number`, an IPv6 address is a `bigint`. A CIDR is a
plain object around one of those. The version is read from `typeof`.

```ts
type Addressv4 = number;   // 0 .. 0xFFFFFFFF
type Addressv6 = bigint;   // 0n .. 2n**128n - 1n
type Cidrv4 = { address: Addressv4; prefixLength: number }
            | { address: Addressv4; mask: Maskv4 };
```

That is what makes the arithmetic direct: `cidrv4Contains` is
`(address & mask) === network`, iteration is `a++`, equality is `===`.
There is no class to construct, nothing to unwrap, and the two address
spaces are disjoint in the type system, so `addr + 1n` on a v4 value is a
compile error rather than a runtime surprise.

`Parsed*` types wrap these for the parser boundary only. A parse result
carries the notation slots (`address`, optional `zoneId`, prefix or mask);
every operation takes the primitive or the bare `Cidr` and ignores zones.

Ruled out: wrapper classes; a `kind` tag on `Cidr` (it would duplicate what
`typeof address` already says); `Uint8Array` as the working form (bytes
are a conversion, see ADR 0008).
