# ADR 0006 - No guards past the parser

Parsers reject bad notation. Nothing else checks its input.

`parseCidrv4("10.0.0.0/255.0.0.255")` parses and stores the mask.
`cidrv4Size` on it returns a number that means nothing. That is the
caller's problem, the same as passing `-1` to `stringifyAddressv4`.

The one exception is a question with no answer: `cidrv4PrefixLength`
on a non-contiguous mask throws `TypeError`, because there is no
prefix length to return. It is not validation; it is the absence of a
result.

The same policy decides which spelling comes out when a value has two.
Match the input form where the output has one; otherwise use the
internal form (mask, compressed, v4 when unmapped); convert only when
the function needs the other form, and that conversion may throw.
`stringifyCidr` writes back the dialect it was given, `cidrv4Mask` on a
prefixed CIDR shifts, `compareCidr` normalises to mask because
prefix-to-mask never throws and a comparator must not.

Ruled out: `number | null` returns (the package's non-throwing path is
`isValid*`, not `null`); range checks inside CIDR operations; a
package-wide null-vs-throw rule.
