# ADR 0010 - A module that stands alone gets its own entry in exports

`.` always maps to `./mod.ts`. A module that is useful by itself gets a
`./<name>` entry next to it.

```jsonc
// packages/@hertzg/binstruct/package.json
"exports": {
  ".": "./mod.ts",
  "./numeric": "./numeric/numeric.ts",
  "./struct": "./struct/struct.ts"
}
```

```ts
import { u32le } from "@hertzg/binstruct/numeric";
```

The import then says which part of the package the caller uses, and doesn't
load the rest. A sub-entry file is public API: it needs `@module` JSDoc, and
removing or renaming it is a breaking change. Only promote a module that is
stable and useful in isolation. Helpers and test utilities stay out of
`exports`.
