# ADR 0010 — Sub-entrypoint exports via `deno.json` `exports` field

**Status:** Accepted

## Context

Many packages have multiple natural import points — a binary codec library has
numeric coders, struct composition, bit-packed structures, and reference
primitives that are useful independently. JSR's `exports` field allows
declaring multiple entry points per package. Bundlers and Deno's module
graph can tree-shake imports targeted at sub-entries, and callers can read
their imports as a clear statement of which subsystems they use.

Forcing every consumer through `mod.ts` couples them to the full surface and
makes documentation harder to navigate.

## Decision

Packages with internal modules that read as standalone import points expose
them via `deno.json` `exports`. The default `.` always maps to `./mod.ts`.
Sub-entries map `./<name>` to a specific file, e.g.:

```json
"exports": {
  ".": "./mod.ts",
  "./numeric": "./numeric/numeric.ts",
  "./struct": "./struct/struct.ts",
  "./bits": "./bits/mod.ts"
}
```

Sub-entry files are public API surfaces. The same JSDoc, stability, and
breaking-change rules apply as for `mod.ts`.

## Consequences

- Callers can import precisely what they need
  (`import { u32le } from "@hertzg/binstruct/numeric"`) without pulling the
  full module graph.
- Each sub-entry file must have an `@module` JSDoc block
  (per ADR 0008).
- Removing or renaming a sub-entry is a breaking change
  (per ADR 0004) and triggers a major version bump.
- The list of sub-entries grows with the package; choosing whether to add
  one is a design call — only promote modules that are stable and useful in
  isolation.
- Internal-only files (helpers, test utilities) stay off the `exports` map
  and are not part of the public surface, even though they compile.

## References

- ADR 0008 — Named exports only; types alongside implementation
- ADR 0004 — Breaking changes use `!` plus `BREAKING CHANGE:` footer
- Example: `packages/@hertzg/binstruct/deno.json`
