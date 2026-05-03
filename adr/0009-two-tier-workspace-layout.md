# ADR 0009 — Two-tier workspace layout: `packages/@<scope>/<name>/`

**Status:** Accepted

## Context

The repo originally used a flat `packages/<scope-name>/` layout — e.g.
`packages/binstruct-png/`, `packages/wg-keys/`. As the package count grew
past a dozen, scope boundaries (`@binstruct/*` vs `@hertzg/*`) became
invisible in the directory tree, and tooling that needed to enumerate
packages by scope had to parse names. New scopes added more flat siblings
with no structural separation.

## Decision

Workspaces live under `packages/@<scope>/<name>/`, mirroring the literal
JSR scope (with the `@` prefix) and package name:

```
packages/
  @binstruct/
    png/
    wav/
    inet/
    tcp/
    ...
  @hertzg/
    binstruct/
    ip/
    mac/
    wg-keys/
    ...
```

The migration from the prior flat `packages/<scope-name>/` layout was done
in `8447a32 chore: group packages by JSR scope folder`.

Each leaf has its own `deno.json` declaring `name`, `version`, and
`exports`. The root `deno.json` enumerates them via `workspace`. Shared
imports are declared once in the root `import_map.json` and inherited by
every workspace (see ADR 0001).

## Consequences

- Scope ownership is visible at the directory level.
- Cross-scope refactors are easier to reason about — one tree per scope.
- Tooling can glob `packages/@<scope>/*` to act per-scope.
- Adding a workspace = creating `packages/@<scope>/<name>/`, registering
  it in the root `deno.json` `workspace` array, and adding the bare
  specifier to `import_map.json`.
- Operational config files also need updates when adding/removing a
  workspace: `.github/labeler.yml`, `release-please-config.json`, the README
  table. Lint tasks (`lint:labeler`, `lint:import-map`, `lint:deps`)
  enforce these.

## References

- AGENTS.md "Workspace Organization" and "Adding New Workspaces"
- ADR 0001 — Bare imports via `import_map.json`
- ADR 0003 — Release Please for monorepo releases
