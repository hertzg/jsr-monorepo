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
- **A standalone import map is held to the strict spec.** Choosing
  `"importMap": "./import_map.json"` over `deno.json`'s own `imports` field
  costs one thing: `imports` is a Deno extension that resolves subpaths from a
  single entry, while a separate map file follows the HTML standard, where it
  does not. A directory mapping there needs a second, trailing-slash entry, and
  its target needs the `jsr:/` form:

  ```jsonc
  "@std/async":  "jsr:@std/async@^1.0.0",     // the module
  "@std/async/": "jsr:/@std/async@^1.0.0/",   // the prefix, note `jsr:/`
  ```

  `import_map.json` sidesteps this by listing every subpath explicitly
  (`"@std/testing/bdd": "jsr:@std/testing@^1.0.16/bdd"`), which is also more
  greppable. Keep doing that. If a trailing-slash mapping is ever added, it
  must take the two-entry `jsr:/` form or it will not resolve.

## References

- AGENTS.md "Dependency Management"
- <https://html.spec.whatwg.org/multipage/webappapis.html#import-maps>
