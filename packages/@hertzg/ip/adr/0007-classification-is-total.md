# ADR 0007 - Classification is total

Every address gets exactly one label. The RFC ranges are parsed once, at
module load, into CIDR constants.

```ts
const CIDR_PRIVATE_10 = parseCidrv4("10.0.0.0/8");
const CIDR_LOOPBACK   = parseCidrv4("127.0.0.0/8");
// classifyAddressv4 checks the specific ranges first and falls
// through to "public"; v6 falls through to "global-unicast".
```

A total classifier lets callers switch on the result with no default
arm, and there is no `null` or `"unknown"` to forget. The constants keep
the range vocabulary in one place, shared by the classifier, the
`isAddressv4*` predicates and the tests, and make each classification a
handful of `&` and `===`.

Check order is part of the contract: more specific ranges before broader
ones. Reordering can move an address between overlapping labels without
changing any type.

Ruled out: parsing ranges per call; hardcoded numeric literals with the
notation only in a comment; a partial classifier.
