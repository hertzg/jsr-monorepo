# ADR 0002 - Messages are own types, not fetch Request and Response

`RtspRequest` and `RtspResponse` are plain object types named after the RFC
7826 grammar. Only the `Headers` class is reused from fetch.

fetch's classes cannot hold what RTSP puts on the wire:

```ts ignore
new Request("*", { method: "OPTIONS" });        // throws: "*" is not a URL
new Response(null, { status: 100 });            // throws: status must be 200-599
new Request(uri, { method: "DESCRIBE" }).method; // "GET" on Bun 1.4.4
```

`Headers` does fit, with two effects on the wire. It keeps names in lower
case, so the encoder writes them back in the RFC's spelling (`CSeq`,
`Content-Length`, `WWW-Authenticate`). It iterates sorted by name, so header
lines go out sorted and repeated lines come in joined with `", "`.

Interleaved binary data is not a message. The RFC says a message is a request
or a response, so the decode stream emits `RtspMessage | InterleavedBinaryData`
and that union has no name.
