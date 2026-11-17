# ADR 0002 - Messages are own types with raw headers, nothing from fetch

`RtspRequest` and `RtspResponse` are plain object types named after the RFC
7826 grammar. `headers` is the header fields as ordered `[name, value]` pairs,
exactly as written, in both directions.

fetch's classes cannot hold what RTSP puts on the wire:

```ts ignore
new Request("*", { method: "OPTIONS" });         // throws: "*" is not a URL
new Response(null, { status: 100 });             // throws: 100 is not allowed
new Request(uri, { method: "DESCRIBE" }).method; // "GET" on Bun 1.4.4
new Headers({ CSeq: "1" });                      // stores "cseq"
```

Names are case-insensitive in the RFC, but not in every camera. The caller
knows what their camera needs, so the spelling, the order and repeated lines
go out and come in untouched. A caller who wants lookup by any spelling builds
it: `new Headers(response.headers).get("content-type")`.

The package writes two headers itself, `CSeq` and `Content-Length`. If the
caller already has one under any spelling, that entry keeps its place and
spelling and gets the new value.

Interleaved binary data is not a message. The RFC says a message is a request
or a response, so the decode stream emits `RtspMessage | InterleavedBinaryData`
and that union has no name.
