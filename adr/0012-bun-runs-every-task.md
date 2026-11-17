# ADR 0012 - Bun runs every task in the repo

Install, tests, scripts and tools all run on Bun. Package source stays
runtime-neutral: it may import `node:` modules, never `bun:`.

```bash
bun install
bun run test    # test:unit (bun test) + test:doc (_tools/doctest.ts)
bun run lint    # typecheck (tsc), oxlint, dprint check, import/labeler/readme checks
```

Tests use `node:test` and `@std/assert`. `@std/testing/bdd` is out because it
calls `Deno.test`; use `describe` and `it` from `node:test`.

Packages are type-checked with `types: ["node"]` and `lib: ["esnext"]`: no DOM
lib, no Bun types. Bun's types change globals like `fetch`, which breaks tests
that stub them. Only `_tools/` and the test files listed in
`_tools/tsconfig.json` see Bun's types. A snapshot test needs `bun:test`, so it
goes on that list and into the root `tsconfig.json` `exclude`.

Formatting is dprint with its Deno preset and a pinned TypeScript plugin, so
the code keeps the style it had. `// deno-fmt-ignore` still works.

Ruled out:

- `bun fmt`. It is Prettier-style and would have changed 360 files.
