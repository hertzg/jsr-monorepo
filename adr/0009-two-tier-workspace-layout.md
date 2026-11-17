# ADR 0009 - A package lives at packages/@scope/name, the same as its registry name

The directory path is the package name. `@hertzg/ip` is at
`packages/@hertzg/ip/`.

```jsonc
// package.json (root)
"workspaces": ["packages/@binstruct/*", "packages/@hertzg/*"]
```

The globs pick up a new directory by themselves. A new package still needs a
label in `.github/labeler.yml`, an entry in `release-please-config.json` and
`.release-please-manifest.json`, a row in the README table, and a
`workspace:*` line in the root `devDependencies` so tests and doc examples can
import it by name. `bun run lint:labeler` and `bun run lint:readme` check the
label and the README row.

Ruled out:

- A flat `packages/<scope>-<name>/`. Scope boundaries were invisible in the
  tree, and tooling had to parse names to find them.
