# ADR 0004 — Firmware variants are `Dialect` values: pure request/parse tables consumed by orchestrators that never branch

**Status:** Accepted (supersedes ADR 0003) — see the field report below, which
settles two of the uncertainties this ADR recorded

## Context

ADR 0003 recorded that this package targets one firmware family — the EU/GDPR
builds exposing `cgi_gdpr` with a text payload format — and left variant support
as an open design problem with four candidate shapes: per-model adapters,
capability negotiation, side-by-side packages, or a pluggable transport.

Issue [#82](https://github.com/hertzg/jsr-monorepo/issues/82) (TP-LINK NE200 5G)
and a second reporter (VX800v) turned that from hypothetical into a second
concrete protocol. Measuring the reporter's HAR capture and reference
implementation against this codebase shows the divergence is narrower, and
differently shaped, than the issue report suggests.

**Identical across both protocols (verified):** the session establishment order
(`GET /` → public key → busy → login → `GET /` for the token → commands); the
AES-CBC + RSA cipher and the `md5(username+password)` hash; the signature
parameter rule — `key`, `iv`, `h`, `s` for login and `h`, `s` for commands, with
`s = sequence + base64length`; the `Set-Cookie: JSESSIONID` session transport;
the `var ee` / `var nn` / `var seq` public-key format; the `var token="…"`
scrape; and plain HTTP/1.1.

The issue's claim that the two use different login signature lengths is false.
Both send 256 hex characters for login and 128 for commands, and that is not a
configured constant at all — it falls out of sign-string length versus modulus
size. Signature construction is therefore _not_ a divergence axis.

**Divergent:** endpoint paths (`cgi_gdpr` vs `cgi_gdpr?9`, `cgi/getParm` vs
`cgi/getGDPRParm`, login as its own endpoint vs login as a command); where the
envelope rides (query string vs request body); default username (`admin` vs
`user`); credential encoding (plain vs base64 fields inside JSON); the command
payload codec (bracketed text blocks vs a JSON envelope); the operation
vocabulary (`1`, `2`, … vs `go`, `gl`, `cgi`) and stack defaults; the session
cookie (`loginErrorShow` + `JSESSIONID` vs `JSESSIONID` alone); and batching (N
actions in one request vs one action per request).

Every divergent item is a pure string transformation or a request description.
Nothing that diverges touches I/O, sequencing, or crypto.

## Decision

- **A `Dialect` is a plain object of pure functions and data** — one request
  builder and one parser per protocol step, plus `encodeLogin`, `encodeCommands`
  and `decodeCommand`. It performs no I/O: builders return a platform `Request`,
  parsers take a string or `Headers`. The request descriptor _is_ `Request`;
  there is no bespoke exchange type, because Deno preserves `Cookie`, `Referer`,
  `Origin` and `TokenID` on a constructed `Request` and `fetch` accepts one
  directly.

- **`authenticate` and `execute` keep their signatures and contain zero dialect
  conditionals.** Both take an optional `dialect` (default `gdprText`) and an
  optional `fetch` (default `globalThis.fetch`). `AuthResult` carries the
  dialect forward, so `execute(baseUrl, actions, auth)` keeps working unchanged.
  If a future model ever forces an edit to `authenticate.ts` or `execute.ts`,
  this ADR is wrong and should be revisited rather than patched around.

- **Two built-in dialects, named by protocol shape, never by model:** `gdprText`
  (TL-MR6400, Archer VR900v, TL-MR6500v, Archer MR600 v2) and `gdprJson` (NE200,
  probably VX800v). Model-to-dialect mapping is a documentation table in
  `mod.ts`; there is **no runtime registry**, as a registry is exactly what a
  third party could not extend without editing this package.

- **Batching is a dialect concern.** `encodeCommands` returns a list of
  `CommandBatch` values, each carrying a plaintext payload and the caller-action
  indices it answers. One batch or N batches are the same code path in
  `execute`.

- **`Action` and `ACT` stay dialect-neutral** and live beside the `Dialect`
  contract in `dialect/dialect.ts`. Dialects translate the numeric action types
  into their own vocabulary. OID strings remain opaque caller data; the package
  does not abstract `IGD_*` versus `DEV2_*`.

- **The family boundary is the cipher and the signature rule.** A device that
  changes AES/RSA, the `h`/`s` derivation, or the 256-for-login /
  128-for-commands consequence of it is not a dialect of this package — it is a
  different package.

- **Dialects are authored by spreading an existing dialect**
  (`{ ...gdprJson, id, commandRequest }`). The interface therefore has **no
  optional members**: optionality would force `dialect.x ?? fallback` at every
  call site, which is the pile of conditionals this design exists to remove.
  Spread composition supplies defaults instead.

- **`gdprJson` ships documented as experimental and unconfirmed on hardware.**
  (Amended by the field report below.) NE200 and VX800v are deliberately _not_
  added to the supported-models list;
  `mod.ts` carries a separate, clearly-labelled experimental section pointing at
  issue #82. Its tests assert the wire format only, never that a device accepts
  it.

- **Write operations throw in `gdprJson`.** `ACT.SET`, `ADD`, `DEL`, `OP` and
  `GS` have no observed JSON mapping in any capture, so `encodeCommands` raises
  a clear error naming the issue rather than guessing a vocabulary (repo ADR
  0006).

- **Capability negotiation is deferred, not rejected.** A future
  `detectDialect(baseUrl, { fetch })` returning a `Dialect` is purely additive.
  Probing is not the default: it costs round trips, the probes are ambiguous,
  and failed login probes can count against the device's lockout counter.

## Consequences

- **Adding a firmware family is one file plus fixtures.** A contributor adds
  `dialect/<name>.ts` spreading an existing dialect, a `<name>.test.ts` with
  captured fixtures, and a row in the models table. No orchestrator file is
  touched.

- **Third parties can ship dialects out of tree.** `Dialect` is a public
  structural type exported from the `./dialect` sub-entrypoint (repo ADR 0010),
  and nothing resolves dialects by name.

- **Reverse-engineering claims become unit tests.** Every dialect member is
  pure, so protocol assertions are string-in/string-out tests needing no device
  — including executable JSDoc examples (repo ADR 0007), which the network-bound
  orchestrators cannot have.

- **`client/*` splits into pure parsers and pure request helpers.**
  `fetchInfo.ts`, `fetchPublicKey.ts`, `fetchBusy.ts`, `fetchSessionId.ts`,
  `fetchTokenId.ts` and `fetchCgiGdpr.ts` become `info.ts`, `publicKey.ts`,
  `busy.ts`, `session.ts`, `token.ts` and `request.ts`, each holding only the
  pure half. The six `fetch` call sites collapse into the two orchestrators.
  `client/encryption.ts` and `client/cipher/` are unchanged: they were already
  dialect-independent apart from an `"admin"` username default, which now comes
  from `Dialect.defaultUsername`.

- **The change is additive.** Options gain optional members, `AuthResult` gains
  `dialect`, and `payload.ts` moves into `dialect/gdprText.ts` — it was never
  re-exported from `mod.ts` and `deno.json` declared only `"."`, so per ADR 0002
  it was internal. Existing `gdprText` users change nothing: a `feat` commit and
  a minor bump, not the major bump ADR 0003 anticipated.

- **One deliberate behavior change in `execute`.** The returned `actions` array
  is now built from the caller's actions, so it always has one entry per input
  action, in input order, and `req` is never `undefined`. Previously its length
  was dictated by the highest action index the router echoed, which truncated
  the tail when the router answered fewer actions and produced entries with
  `req: undefined` when it answered more. For a router that echoes every
  requested index — every observed case — the result is identical.

- **Adding a member to `Dialect` later is compatible for spread-authored
  dialects and breaking for from-scratch implementors.** Spread composition is
  documented as the sanctioned authoring style precisely to keep that door open.

- **The `gdprJson` details carry real uncertainty, each contained in one
  member.** The `?9` suffix is unexplained; the per-operation stack defaults
  come from a single sample; the error field name in a failing JSON response is
  unverified (since settled — see the field report below), so an unrecognizable
  failure decodes to `-1`; and the NE200 login
  page is never scraped because its structure is unknown and nothing in that
  flow consumes it.

## Field report — EX220 (issue #254)

The `gdprJson` dialect was written without a device. An EX220 owner, who had
independently forked this package to reach the same firmware, ran the shipped
dialect against their router and reported back on
[issue #254](https://github.com/hertzg/jsr-monorepo/issues/254). What that
changes:

- **`gdprJson` is no longer documented as experimental, and EX220 is on the
  supported-models list.** Login through the `cgi` operation and a
  `[ACT.GET, "DEV2_DEV_INFO"]` read both worked unmodified. NE200 and VX800v
  stay off the list — they are still the models nobody has run it against,
  which inverts the original wording: the dialect is confirmed on a device it
  was not built from.

- **The error field name is settled: lowercase `errorcode`.** A raw failing
  response (`"success": false, "errorcode": 9804`) matches what `decodeCommand`
  already reads, so the `-1` fallback is now a fallback rather than the likely
  path.

- **`go` is the GET operation, with no per-model variance.** The reporter's own
  implementation spelled it `get`; their EX220 answered a `go` read from this
  package normally, so that spelling was an unused path in the fork rather than
  firmware divergence, and `OPERATIONS` stays a single table.

- **`defaultUsername: "user"` is right for this firmware.** The EX220 web UI
  asks for a password only and never names the account; `user` is what it logs
  in as. The `adminType` scrape stays the better source, since it is what a
  provisioned-admin device would report differently.

Still open, unchanged by this report: the `?9` suffix is unexplained, write
operations have no observed mapping and still throw, and no NE200 or VX800v has
ever been tested.

## References

- ADR 0001 — stateless functional API (preserved: a `Dialect` is a literal, not
  state)
- ADR 0002 — internal two-layer organization; pre-authorizes promoting a layer
  to a public sub-entrypoint, which `./dialect` now is
- ADR 0003 — superseded by this ADR
- Repo ADR 0006 — no defensive programming; throwing only on genuine boundary
  failures
- Repo ADR 0007 — JSDoc examples as executable tests
- Repo ADR 0010 — sub-entrypoint exports (`./dialect`)
- `dialect/dialect.ts` — the `Dialect` contract and the action vocabulary
- `dialect/gdprText.ts`, `dialect/gdprJson.ts` — the built-in dialects
- `authenticate.ts`, `execute.ts` — the dialect-driven orchestrators
- Issue [#82](https://github.com/hertzg/jsr-monorepo/issues/82) — NE200 request,
  protocol diff, HAR capture, and reference implementation
- Issue [#254](https://github.com/hertzg/jsr-monorepo/issues/254) — EX220 field
  report: the first run of `gdprJson` against real hardware
