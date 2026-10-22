# ADR 0003 - The package has one entry point

`deno.json` exports only `"."`. `mod.ts` holds `createClient`, the `Client`
type, and re-exports the types and `parse*` functions a consumer may need.
Everything else (`isapi/`, `multipart/`, `events/`, `config/`) is internal
and may be renamed freely. JSDoc examples in internal modules import
relatively.

```jsonc
// before: 16 sub-paths, 16 stability contracts
"exports": { ".": "./mod.ts", "./events/alert": "./events/alert.ts", … }
// after
"exports": "./mod.ts"
```

Nobody imports those files directly. The multipart reader is how the stream
arrives, not a feature.

Ruled out:

- Exporting `./events/alert` and `./multipart/parts` as "useful alone".
  Replaying a capture works through the root's `parseAlert`, and a custom
  transport is not a use case anyone has.
