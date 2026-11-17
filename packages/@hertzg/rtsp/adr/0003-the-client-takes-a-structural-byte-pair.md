# ADR 0003 - The client takes a structural byte pair and wraps it

`createClient` asks only for `getReader()` and `getWriter()` with `read`,
`cancel`, `write`, `close` and `abort`. It wraps each side in its own stream
and calls nothing else on what the caller passed.

The global `ReadableStream` type is not one type. A TCP socket on Bun or Node
gives the `node:stream/web` one, and TypeScript rejects it where the global
one is asked for:

```ts ignore
createClient(Duplex.toWeb(socket));
// TS2345 with lib [ESNext, DOM] and types [bun]:
// the types of 'readable.getReader' are incompatible
```

The structural type accepts both, and the package needs no runtime's types.

What the caller gives up: the client holds the reader and the writer for its
whole life, and a writable that fails while nothing is being written is
noticed on the next write, not at once.

Ruled out:

- Naming both stream types in a union. The package's types would then need
  Node's types to resolve, in every consumer.
- Taking the structural type and casting it to a global stream inside. The
  type would promise less than `pipeThrough` needs.
