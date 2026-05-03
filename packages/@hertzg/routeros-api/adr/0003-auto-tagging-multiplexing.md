# ADR 0003 — Auto-tagging at the client layer enables concurrent `send()` over a single connection

**Status:** Accepted

## Context

The MikroTik API protocol supports multiplexing multiple in-flight
commands over a single TCP connection via the `.tag` attribute: a
client stamps a unique tag on each command, and the router echoes
that tag back on every reply. Without tagging, the only safe pattern
is one-command-at-a-time — send, wait for `!done`, send the next.

Tagging is a fully optional protocol feature. The protocol layer
(`protocol/command`, `protocol/reply`) does not generate or
interpret tags — it just passes attributes through. That keeps the
codecs and protocol types usable for callers who want to manage
tags themselves.

For the high-level client, however, single-flight is a poor default:
most real applications want to issue several queries in parallel
(`/interface/print`, `/ip/address/print`, `/ip/route/print`) and
collect their results.

## Decision

The high-level client manages tagging automatically:

- Each `client.send(command)` call generates a fresh tag
  (`crypto.randomUUID()`).
- The tag is added to `command.attributes[".tag"]` before encoding,
  overwriting any tag the caller may have set.
- A background read loop reads replies, looks up the pending request
  by tag, and routes the reply into that request's buffer.
- A request resolves on the matching `!done`, rejects on `!fatal`,
  and accumulates `!re` data replies into the buffered result.
- A `!fatal` rejects all pending requests and stops the read loop.

Multiple `client.send()` calls can be in flight simultaneously and
finish in any order. The lower layers stay tag-agnostic.

## Consequences

- **`Promise.all([client.send(a), client.send(b), client.send(c)])`
  works without any extra state on the caller side.**
- **The client owns `.tag`.** Setting `.tag` in a command passed to
  `client.send()` is overwritten — callers who want explicit tag
  control bypass the client and use the streams + protocol layers
  directly.
- **Tag collisions are not a concern.** UUIDs are generated per
  call; the pool is effectively infinite.
- **`!fatal` is fail-loud and global.** A single fatal reply
  rejects every pending request and tears down the read loop;
  there is no per-request recovery.
- **Order of replies in a `Reply[]` matches the wire order** within
  a single command. Across commands, ordering is independent.

## References

- `client.ts` — `createClient`, `pendingRequests`, read loop
- `utils/tag.ts` — tag accessor helpers (used by the protocol layer)
- ADR 0001 — Layered architecture
- ADR 0002 — WebStreams at the boundary
