# ADR 0002 — Internal two-layer organization; single public entrypoint

**Status:** Accepted

## Context

The TP-Link login flow is multi-step and the encryption setup is
non-trivial: scrape router info from the login page HTML, fetch
the RSA public key, build an AES+RSA cipher, check whether the
session is already authenticated, fetch a session ID, fetch a
token ID. Inlining all of that into one function would be hard
to read and impossible to test piece by piece.

The codebase splits these into a `client/` directory of
small per-step files (`fetchInfo`, `fetchPublicKey`, `fetchBusy`,
`fetchSessionId`, `fetchTokenId`, `fetchCgiGdpr`, plus
`encryption` and `cipher/`). Top-level `authenticate.ts` and
`execute.ts` are thin orchestrators that compose them.

Sister package `@hertzg/routeros-api` exposes its layers as
public sub-entrypoints. This package does not — `mod.ts` only
re-exports `authenticate`, `execute`, `ACT`, `Action`, and the
related types.

## Decision

The package keeps two layers internally:

- **`client/*` — building blocks.** One concern per file: a
  single HTTP fetch, a crypto primitive, an encryption setup.
  Easy to test, easy to swap if a step changes.
- **`authenticate.ts`, `execute.ts` — orchestrators.** Compose
  the building blocks into the user-facing flow.

The public surface stays small: only the orchestrators and their
types are exported via `mod.ts`. The `client/*` layer is *not*
re-exported and *not* listed as sub-entrypoints in `deno.json`.

## Consequences

- **`mod.ts` is the contract.** Anything not re-exported is
  internal and free to change without a major bump.
- **Refactoring inside `client/*` is free.** Splitting
  `fetchSessionId` into multiple files, swapping the HTTP layer,
  or restructuring `cipher/` does not affect consumers.
- **If a future need calls for finer-grained access** (e.g.
  using just the `cgi_gdpr` fetch with a pre-built encryption),
  the layer is ready to be promoted to a public sub-entrypoint
  per repo ADR 0010 — without rewriting code.
- **Per-step testing is straightforward.** Each `client/*` file
  is a small, independently-callable unit; `mod.test.ts` and
  the per-file tests cover them.
- **The package looks smaller from the outside than it is.**
  That's intentional — the public surface should reflect what
  the package commits to, not what's in the directory tree.

## References

- `mod.ts` — public re-exports
- `client/` — internal building blocks
- `authenticate.ts`, `execute.ts` — orchestrators
- `@hertzg/routeros-api` ADR 0001 — the contrasting choice
- Repo ADR 0010 — Sub-entrypoint exports per package
