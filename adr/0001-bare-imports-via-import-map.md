# ADR 0001 — Bare imports via `import_map.json`, no `deps.ts`

**Status:** Accepted

## Context

Deno projects historically use `deps.ts` files to centralize third-party
imports. JSR-published Deno workspaces, however, support `imports` in
`deno.json` and a root `import_map.json` for bare specifiers. Maintaining
`deps.ts` files alongside an import map duplicates the source of truth and
makes JSR publishing harder.

## Decision

All third-party and intra-workspace dependencies are declared in the root
`import_map.json` and consumed via bare specifiers (`@std/assert`,
`@hertzg/binstruct`). No `deps.ts` file exists in any package.
Intra-package imports use `./something.ts` relative paths. `node:` specifiers
are allowed.

## Consequences

- Single source of truth for versions; JSR publishing reads it directly.
- Adding a new workspace requires adding its bare specifier to
  `import_map.json`.
- `deno task lint:import-map` enforces the rule.
- Updating a version invalidates `_deps.snap` snapshots — see ADR 0005.

## References

- AGENTS.md "Dependency Management"
