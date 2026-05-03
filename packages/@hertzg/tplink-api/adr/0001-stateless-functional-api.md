# ADR 0001 — Stateless functional API: `authenticate` returns a session context, `execute` consumes it

**Status:** Accepted

## Context

The TP-Link router API runs over HTTP — there is no long-lived TCP
connection or duplex socket the way the MikroTik API has (see
`@hertzg/routeros-api`). Each operation is a `fetch` against the
router's web endpoints, carrying session cookies and a token in
the headers. The session itself is essentially a tuple of
short-lived strings plus an encryption context.

A stateful `Client` object would still be a thin wrapper around
that tuple — and would obscure the natural lifecycle (auth →
many calls → reauth or stop) under method dispatch.

## Decision

Two free functions form the public API:

- **`authenticate(baseUrl, options)`** runs the multi-step login
  (fetch info → RSA pubkey → create AES+RSA encryption → check
  busy → fetch session ID → fetch token ID) and returns an
  `AuthResult` containing `{ encryption, sequence, info, sessionId,
  tokenId }`, or `null` on failure.

- **`execute(baseUrl, actions, options)`** takes the `AuthResult`
  back as `options` and runs one HTTP request: serialize actions,
  encrypt, POST to `cgi_gdpr`, decrypt, parse, map back to the
  request actions.

The package owns no state across calls. The caller stashes the
`AuthResult` wherever fits their app and passes it to every
`execute`. Re-authentication is just calling `authenticate` again
and replacing the stored result.

## Consequences

- **Concurrent `execute` calls are safe** as long as each carries
  the same valid `AuthResult` — nothing in the package mutates the
  session object.
- **No cleanup is required.** There is no socket to close, no
  background task to cancel.
- **Session expiry is the caller's problem.** When the router
  returns an auth error, the caller decides whether to retry,
  re-authenticate, or surface the failure.
- **`AuthResult` is serializable** in principle — practical only
  for short windows since the router invalidates sessions
  aggressively, but useful for debugging and tests.
- **No reconnect logic, no retries, no backoff.** A failed
  `execute` returns `{ error: -1, actions: [] }` for transport
  failure, or a non-zero `error` for router-side errors. The
  caller decides what to do.

## References

- `authenticate.ts` — `authenticate`, `AuthOptions`, `AuthResult`
- `execute.ts` — `execute`, `ExecuteOptions`, `ExecuteResult`,
  `ActionResult`
- `mod.ts` — public surface
