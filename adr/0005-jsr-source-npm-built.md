# ADR 0005 - Every package ships to JSR as source and to npm as built JavaScript

Both registries get the same modules, selected by `files` in `package.json`.
JSR gets the TypeScript. npm gets `.js` and `.d.ts` built into `dist/`.

```
package.json --+-- _tools/build_jsr.ts --> jsr.json (generated) --> bun x jsr publish
               +-- _tools/build_npm.ts --> dist/<scope>/<name>/ --> npm publish <tarball> --provenance
```

`@std/*` lives on npm.jsr.io, which someone installing from the npm registry
can't reach. So the npm build copies those packages into the tarball as
`bundleDependencies`. `_tools/verify_npm.ts` installs every tarball into a
throwaway project with `bun` and with `npm`, imports every `exports` entry
under `bun` and `node`, and type-checks them.

The npm CLI does the npm publish because it is the only client that does
trusted publishing. The `jsr` CLI downloads its own Deno to publish. That is
the only place Deno runs in this repo.

Never publish from inside `packages/`. That ships TypeScript with dependencies
no npm consumer can resolve. Only `dist/` is publishable.
