# ADR 0002 — WebStreams at the boundary; no connection lifecycle management

**Status:** Accepted

## Context

Every JS runtime provides a different way to open a TCP socket:
`Deno.connect`, Node `net.createConnection`, Bun.connect, browser
proxies (WebSocket-tunneled or WebTransport). They also differ in
how TLS is negotiated, how reconnects are handled, and what
abstractions wrap the raw bytes.

A package that hard-codes one runtime's connection API can only run
in that runtime. A package that tries to abstract over all of them
ends up reinventing socket policy badly. A package that *handles
no connection at all* is portable to anything that can produce a
duplex byte stream — including in-memory mocks for testing.

## Decision

The client takes a single options object whose only fields are the
streams:

```ts ignore
type ClientOptions = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};
```

The package never:

- Opens a connection (no hostname or port arguments anywhere).
- Closes the underlying socket. `client.quit()` sends `/quit` and
  closes its own writer; the caller closes the socket.
- Applies TLS — if the caller wants TLS, the streams they hand in
  are already wrapping a TLS socket.
- Reconnects, retries, keeps alive, or applies timeouts.

All of that is the caller's responsibility, on whatever runtime
they're using.

## Consequences

- **Environment-agnostic.** Deno, Node, Bun, browsers (over a
  proxy), and in-memory mock streams all work without code changes.
- **Tests are easy.** Pair a `TransformStream` with an
  `IdentityStream` to round-trip commands and replies in pure
  memory.
- **Connection failure is the caller's problem.** A dropped TCP
  socket surfaces as a stream error, which the package propagates
  but does not handle.
- **The client owns no socket lifetime guarantees.** `client.quit()`
  is a graceful protocol close; it does not promise the underlying
  transport is closed when it returns.
- **Reconnect logic, if needed, lives one layer up.** Build a new
  client around new streams when reconnecting; do not reuse a
  client across socket replacements.

## References

- `client.ts` — `ClientOptions`, `createClient`
- ADR 0001 — Layered architecture
