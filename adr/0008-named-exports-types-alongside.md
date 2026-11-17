# ADR 0008 - Exports are named, and types live beside their implementation

No `export default`, no `types.ts`. Every file reachable from `exports` in
`package.json` is public API, not only `mod.ts`.

```ts
// packages/@hertzg/ip/address.ts
export type Address = Addressv4 | Addressv6;
export function stringifyAddress(address: Address | ParsedAddress): string { /* ... */ }
```

- Type-only exports use `export type`, so they erase cleanly.
- Every exported file opens with module-level JSDoc and an `@module` tag.
- Prefer functions. Use a class only when state and identity need one.

A default export has no name of its own, so renames and re-exports get
ambiguous. A separate `types.ts` splits code that changes together and invites
import cycles. Adding a public file means accepting it as a stable entry point.
