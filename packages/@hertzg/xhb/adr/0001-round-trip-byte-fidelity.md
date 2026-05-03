# ADR 0001 — Round-trip byte fidelity is the primary correctness criterion

**Status:** Accepted

## Context

XHB is the XML save format for
[HomeBank](https://www.gethomebank.org/), an open-source personal
finance app. Users keep these files for years, version-control them,
diff them across releases, and feed them back into HomeBank itself.
A "parse-then-serialize" cycle that subtly changes byte-level output
breaks all of those workflows: diffs become noisy, integrity tools
flag spurious changes, and HomeBank may reject or misread modified
files.

The library has only one job worth doing well — read XHB, hand the
caller a typed object, and write it back exactly as HomeBank would.

## Decision

`parse → serialize` produces output that is **byte-identical** to
what HomeBank itself emits for the same data. Tests assert this on
real fixture files.

This single goal drives every other rule in the package:

- Numeric precision is preserved (see ADR 0002 — `gDouble = string`).
- XML attribute escaping mirrors HomeBank's `hb_xml_escape_text`
  (control characters → numeric entities, `&'"<>` → named
  entities).
- Attribute omission rules match HomeBank: integer attributes equal
  to `0` are dropped, not emitted as `name="0"`.
- Field order in serializers matches the order HomeBank writes.
- Missing attributes parse to `0` / empty string (mirroring C
  `atoi`) so they re-serialize to the same omitted form.

## Consequences

- **Departures from "modern" TS patterns are deliberate.** Returning
  `0` for missing numeric attributes (rather than `undefined`) is
  not a parse error — it is what makes round-trip work.
- **Adding a feature that changes output byte-by-byte is a breaking
  change.** Even something as small as quoting style or trailing
  whitespace.
- **Test suite uses real fixtures.** Synthesized XML is insufficient;
  the regression risk lives in HomeBank-specific quirks.
- **The library does not "clean up" or normalize input.** If
  HomeBank emits a redundant attribute, the library round-trips it.

## References

- `_serialize.ts` — `hb_xml_attr_int`, `hb_xml_attr_txt`,
  `hb_escape_text`, `hb_xml_tag`
- `_parse.ts` — `atoi` (returns `0` for null/undefined input)
- `fixtures/` — real XHB files used in round-trip tests
- ADR 0002 — `gDouble` is `string` to preserve precision
