# ADR 0003 — Module layout mirrors HomeBank's C source

**Status:** Accepted

## Context

This package is a port of long-standing XHB read/write logic
written before it landed in this monorepo. Modules, naming, and
helper boundaries track the original C source rather than being
re-architected for TypeScript:

- One file per entity (`account.ts`, `archive.ts`, `category.ts`,
  …) corresponding to one C struct + parse/serialize pair.
- Private helper file `_serialize.ts` contains functions named
  `hb_xml_attr_int`, `hb_xml_attr_txt`, `hb_escape_text`, etc.,
  one-to-one with HomeBank's C functions of the same names.
- `_parse.ts` mirrors the same vocabulary (`atoi`, `parseGCharP`,
  `parseGDouble`).
- Constants (`ACCOUNT_FLAG_*`, `OPERATION_FLAG_*`, `PAY_MODE_*`)
  are flat top-level exports with C-style names.

This isn't a clean-architecture decision. The package is a
maintenance vehicle for tracking HomeBank's format, and "looks like
the C source" is what makes upstream fixes portable with low
effort. It has not been redesigned because the cost of redesign
exceeds the savings.

## Decision

Module organization, helper naming, and constant names follow
HomeBank's source. New entities go in their own file; new helpers
keep the `hb_` prefix when they correspond to a HomeBank C
function.

The trade-off is acknowledged: this layout is **not idiomatic
TypeScript**. It is idiomatic *HomeBank-port TypeScript*, which is
a different thing.

## Consequences

- **Porting upstream changes is mechanical.** A new flag in
  HomeBank → a new constant in the matching `<entity>.ts` file with
  the same name.
- **The package reads as a translation, not a redesign.** Anyone
  reaching for "where does HomeBank handle X" can grep for the
  C function name and find its TS counterpart.
- **TS-idiomatic refactors are not free.** Renaming `atoi` to
  `parseInteger`, splitting `_serialize.ts` by concern, or hiding
  `gDouble` behind a richer `Money` type would all break the
  one-to-one mapping that makes upstream tracking cheap.
- **The burden of justification lies with rewrites.** If a future
  contributor wants to depart from this layout, they should explain
  why the redesign's cost is worth losing the upstream-mapping
  property.
- **Property names are an exception.** Entity interfaces use
  descriptive TS-style names (`startingBalance`, not `initial`)
  for caller ergonomics, with the rename happening once in each
  entity's `parse`/`serialize`. The wire-format names stay in the
  XML.

## References

- Per-entity files: `account.ts`, `archive.ts`, `assign.ts`,
  `category.ts`, `currency.ts`, `operation.ts`, `payee.ts`,
  `properties.ts`, `tag.ts`, `versions.ts`
- `_parse.ts`, `_serialize.ts` — `hb_*` helpers
- HomeBank source: <https://www.gethomebank.org/>
