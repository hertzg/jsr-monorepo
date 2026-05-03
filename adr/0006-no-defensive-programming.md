# ADR 0006 — No defensive programming

**Status:** Accepted

## Context

All packages in this repo — binary codecs, network APIs, utility libraries —
are typed end-to-end and consumed from typed call sites. Runtime guards for
conditions the type system already enforces are noise: they bloat the API
surface, slow the hot path, and signal distrust of TypeScript. The pattern
is especially harmful in binary encoding/decoding hot paths, but the
principle applies repo-wide.

## Decision

No package validates inputs that TypeScript already constrains. This applies
to every workspace in the monorepo, including:

- `@hertzg/binstruct` and the `@binstruct/*` codec family
- `@hertzg/*` utility libraries (`bx`, `ip`, `mac`, `crc`, `xhb`)
- API clients (`routeros-api`, `tplink-api`, `mymagti-api`, `wg-*`)

JSDoc documents the contract. Errors are thrown only for genuine boundary
failures — malformed bytes on the wire, HTTP error responses, parse errors
from external input — never for "did the caller pass the right type."

Misuse from typed call sites is undefined behavior. This is intentional.

## Consequences

- Smaller, faster API surfaces; no `if (typeof x !== "number") throw …`.
- Callers are responsible for buffer sizes and well-formed inputs.
- JSDoc must document the contract clearly since runtime won't catch
  misuse.
- Boundary errors (network, parsing untrusted bytes) still throw —
  these are not type assertions, they are real failures.

## References

- AGENTS.md "Code Standards / No Defensive Programming"
