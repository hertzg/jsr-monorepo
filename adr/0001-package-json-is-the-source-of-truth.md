# ADR 0001 - Each package is described by its own package.json and nothing else

A package's name, version, exports, shipped files and dependencies live in its
`package.json`. No other file repeats them, and code imports by bare name.

```jsonc
// packages/@hertzg/xhb/package.json
"exports": { ".": "./mod.ts" },
"files": ["**/*.ts", "!**/*.test.ts", "!fixtures/**"],
"dependencies": { "@std/xml": "npm:@jsr/std__xml@^0.2.0" }
```

A dependency bump is then an edit inside the package's directory, which is how
Release Please knows the package needs a release. A sibling is written
`workspace:^`, so it follows the sibling's version with no sync step. `@std/*`
comes from JSR through the `npm:@jsr/std__<name>` alias. Test-only dependencies
go in the root `devDependencies`. `jsr.json` is generated and ignored by git.
`bun run lint:imports` fails on an undeclared import or an unused dependency.

Ruled out:

- A root import map. A bump touched no package directory, so it could not ship.
- `deps.ts` re-export files. A second place to keep in sync.
