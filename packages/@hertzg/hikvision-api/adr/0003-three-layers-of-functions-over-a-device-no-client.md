# ADR 0003 - Three layers of functions over a plain Device, no client object

`deno.json` exports only `"."`. There is no `createClient`: a `Device` is
`{ baseUrl, username, password, fetch? }` and every call takes it first.
The two verbs are shaped like `fetch(input, init)`: the second argument
says what comes back.

```
http/request.ts    send(device, path, init) -> Response          fetch + Basic auth, no ISAPI
http/multipart.ts  bytes -> parts
isapi/request.ts   request(device, path | resource, init)        Response | decoded T, IsapiError
isapi/stream.ts    stream(device, resource, { signal })          ReadableStream<T>
isapi/<tree>/*.ts  deviceInfo, motionDetection({ channel }), alertStream   Resource<T> = { path, codec }
```

`nvr.channels()` promised every device has channels; a camera answers
`notSupport`. `request(camera, inputProxyChannels)` promises only "ask this
endpoint for this document". Hikvision's own `websdk.js` has the same shape:
a table of name to URL, `GetDeviceConfig`/`SetDeviceConfig` over it, and a
write sends back the document the read returned, edited. Writes here will be
`request(device, resource, { method: "PUT", body })`, encoding into that tree.

Ruled out:

- Named methods per resource. Each touched `mod.ts` twice and hid the verb.
- `get`/`put`/`read`. The protocol is HTTP methods on paths; `request` says so.
- A camera/NVR split at the type level. Firmware varies inside each kind.
