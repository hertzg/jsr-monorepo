# ADR 0001 — Layered architecture: encoding → protocol → streams → client; every layer is publicly exported

**Status:** Accepted

## Context

A MikroTik API client touches several distinct concerns:

- The wire-format primitives (variable-length integers, length-prefixed
  UTF-8 words, zero-terminated sentences).
- The semantic protocol on top (typed `Command` requests, typed `Reply`
  responses split into `done` / `re` / `trap` / `fatal`).
- I/O integration (turning a TCP byte stream into a stream of replies
  and vice versa).
- Application ergonomics (auto-tagging, request/reply correlation,
  graceful shutdown).

Bundling all of this behind a single high-level `connect()` function
forces every consumer through that gate, even when they only need
the codec or a stream adapter — for testing, packet inspection,
embedding in a different transport, or building higher-level tooling.

## Decision

The package is split into five layers, each in its own subdirectory and
each declared as a sub-entrypoint in `deno.json` (per repo ADR 0010):

```
encoding/length   — variable-length integer codec (1–5 bytes)
encoding/word     — length-prefixed UTF-8 string codec
encoding/sentence — zero-terminated sequence-of-words codec
protocol/command  — typed Command  → string[] of words
protocol/reply    — string[] of words → typed Reply (discriminated union)
streams/encode    — TransformStream<Command, Uint8Array>
streams/decode    — TransformStream<Uint8Array, Reply>
utils/tag         — .tag attribute helpers
client            — high-level send/quit with auto-tagging
```

Higher layers depend on lower ones; lower layers do not import upward.
Each layer is independently importable — a caller can use the codecs
alone, the protocol types alone, the streams without the client, or
the client without thinking about anything below.

## Consequences

- **Pick the layer that fits.** A test harness can stub a
  `TransformStream`. A packet inspector can use just `decodeSentence`.
  A custom client with different multiplexing can use the streams
  directly.
- **Adding a feature lives at one layer.** Auto-tagging is a client
  concern; supporting a new reply category is a protocol concern;
  fixing an integer-encoding edge case is an encoding concern.
- **Tree-shaking is mechanical.** Importing
  `@hertzg/routeros-api/encoding/length` does not pull in the
  client or streams.
- **Public surface is large.** Every layer is a stable API; renaming
  `decodeWord` is a breaking change. Worth it for the composition
  flexibility.
- **The high-level client is "just" the topmost layer.** It has no
  privileged access; anything it does could be done by a user of
  the lower layers.

## References

- `deno.json` — sub-entrypoint exports
- `encoding/length.ts`, `encoding/word.ts`, `encoding/sentence.ts`
- `protocol/command.ts`, `protocol/reply.ts`
- `streams/encode.ts`, `streams/decode.ts`
- `client.ts`
- Repo ADR 0010 — Sub-entrypoint exports per package
