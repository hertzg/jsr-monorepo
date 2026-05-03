# ADR 0004 — Reply is a discriminated union; codecs return `{value, bytesRead}` for caller-managed cursors

**Status:** Accepted

## Context

The MikroTik API has four reply categories with distinct shapes:

- `!done` — successful command completion, optional attributes.
- `!re` — a data row in a multi-row response, always with attributes.
- `!trap` — a non-fatal error with a message and optional category.
- `!fatal` — connection-terminating error with a message.

Modeling these as a single `Reply` type with optional fields would
push every consumer through `if (reply.message)` checks and lose
the distinction between "this kind has no message" and "the router
omitted the message". A discriminated union makes the reply kind
explicit at the type level.

Below the protocol layer, the codecs (length, word, sentence) need
to compose: a sentence decoder calls a word decoder repeatedly,
each call advancing the buffer cursor. Streaming the cursor
through return values rather than mutable state lets the codecs
remain pure functions and lets the decode stream buffer partial
TCP reads naturally.

## Decision

**Replies** are a discriminated union over a `type` literal:

```ts ignore
type Reply = DoneReply | DataReply | TrapReply | FatalReply;
// type: "done" | "re" | "trap" | "fatal"
```

Each variant carries only the fields meaningful for its kind.
Type-guard predicates `isDone`, `isData`, `isTrap`, `isFatal`
narrow `Reply` for callers who prefer guards over `switch (type)`.

**Codecs** are pure functions returning `{ value-field, bytesRead }`
plus an optional `offset` argument:

```ts ignore
decodeLength(bytes, { offset })   → { length, bytesRead }
decodeWord(bytes, { offset })     → { word, bytesRead }
decodeSentence(bytes, { offset }) → { words, bytesRead }
```

The caller advances its own cursor by adding `bytesRead` after
each call. The decode `TransformStream` applies this pattern with
an internal buffer: it appends each chunk, decodes as many full
sentences as possible, breaks on incomplete-data errors to wait
for more bytes, and trims the consumed prefix.

This mirrors the cursor convention from `@hertzg/binstruct`
(parents compute their own cursor by summing children's
`bytesRead`).

## Consequences

- **Exhaustive `switch` on `reply.type` is the canonical pattern.**
  TypeScript checks that all four cases are handled.
- **Adding a new reply type is a breaking change** that ripples
  through every exhaustive switch — that's the price of the
  discriminated union, and it's the right price.
- **Codec functions are unit-testable as plain values in/out.**
  No streams, no buffers required for testing the wire format.
- **Composition is by addition, not by mutation.** Any layer that
  decodes a sentence reads `{words, bytesRead}` and adds
  `bytesRead` to its own cursor.
- **Partial-read handling is centralized in the decode stream.**
  Codecs don't know about streams; the stream catches incomplete-data
  `RangeError`s and waits for more bytes.
- **The decode stream errors at flush if the buffer isn't empty.**
  An incomplete final sentence is not silently dropped.

## References

- `protocol/reply.ts` — `Reply`, `DoneReply`, `DataReply`,
  `TrapReply`, `FatalReply`, `isDone`, `isData`, `isTrap`,
  `isFatal`, `parseReply`
- `encoding/length.ts`, `encoding/word.ts`, `encoding/sentence.ts`
- `streams/decode.ts` — `createApiDecodeStream`
- `@hertzg/binstruct` ADR 0001 — Coder protocol with `[value, bytesRead]`
