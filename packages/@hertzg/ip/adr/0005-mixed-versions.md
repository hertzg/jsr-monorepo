# ADR 0005 - Mixed versions

Operations throw, predicates return `false`, comparators order v4 before
v6. Nothing converts between versions on its own.

```ts
cidrContainsCidr(v4, v6)              // TypeError
cidrIntersect(v4, v6)                 // TypeError
cidrMerge([v4, v6])                   // TypeError
cidrContains(v4Cidr, v6Address)       // false
compareAddress(v4, v6)                // -1
compareCidr(v4, v6)                   // -1
```

The line is whether an answer exists without inventing a conversion.
"Does `10.0.0.0/8` contain `2001:db8::/32`" has none, and both arguments
are developer-written, so a mismatch is a typo worth a loud error.
"Is this address a member of that block" has one: the spaces are
disjoint, so `false` is the true answer, and the address usually comes
off the wire from a dual-stack listener, so a throw would land in the
request path. Ordering has one too: order each half, then say which half
comes first. A throwing comparator crashes `sort` at a position that
depends on the pivot.

Comparators are total, `-1 | 0 | 1`, numeric within a version, and for
CIDRs tie-break on prefix length ascending. They compare the value as
given: no masking, no unmapping.

Ruled out: silent `false` from the throwing operations (a typo passes a
guard); a `cidrContainsAny` wrapper (`some` over `cidrContains` is
already correct on a mixed list); interleaving v4 among v6 by mapping,
as `ip6addr` does.
