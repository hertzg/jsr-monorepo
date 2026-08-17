# ADR 0002 - Naming

Two nouns, `Address` and `Cidr`. Two suffixes, `v4` and `v6`. Free
functions only.

`Ip` names the protocol family and never a value. It survives in
`IpVersion` and the package name, nowhere else: `parseAddress`,
`isAddressv4Private`, `ClassifiedAddressv6`. A name without a suffix
takes either version and dispatches on `typeof`; a suffixed name takes
one version and is the ground truth the universal one calls.

```
parseAddress    parseAddressv4    parseAddressv6
cidrContains    cidrv4Contains    cidrv6Contains
```

Verb-first for actions (`parse`, `stringify`, `classify`, `compare`,
`map`, `unmap`), `is` for predicates, noun-first for CIDR operations.
Predicates return `boolean` and never throw. Submodules follow the same
grid: `addressv4`, `cidrv6`, `classify`, one file per concern and version.

Ruled out: classes and namespaces (`Ipv4.parse`), which add a constructor
and fight tree-shaking for no gain over module exports; literal unions
for prefix lengths (`0 | 1 | ... | 32`), because `prefixLength + 1` falls
out of the union and every internal step would need a cast.
