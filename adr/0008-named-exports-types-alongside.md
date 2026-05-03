# ADR 0008 — Named exports only; types alongside implementation

**Status:** Accepted

## Context

Default exports complicate tree-shaking, IDE rename refactors, and
module-graph analysis. A separate `types.ts` file fragments related code and
creates circular-import risk when types reference runtime values. JSR
publishes whatever the package exports, so the public surface needs to be
deliberate and readable.

## Decision

- **Named exports only** — no `export default`.
- **Type-only exports use `export type`**, enabling proper erasure.
- **Types live alongside their implementation** — no `types.ts` files.
- **Every `mod.ts` has a module-level JSDoc** with an `@module` tag.
- **All exported files are treated as public API surfaces**, not just
  `mod.ts` — anything reachable from `exports` in `deno.json` is public.
- **Functions are preferred over classes** unless state and identity
  require a class.

## Consequences

- Tree-shaking works without bundler hints.
- `export *` re-exports must be intentional; types and runtime values can
  be re-exported in the same statement.
- Refactoring across files is mechanical (no default-export rename
  ambiguity).
- Adding a public file means accepting it as a stable API entry point.

## References

- AGENTS.md "Module Organization"
