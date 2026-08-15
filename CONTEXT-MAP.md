# Context Map

This monorepo has multiple contexts — each package owns its own domain language.
Repo-wide architectural decisions live in `adr/`; package-specific decisions
live in each package's `adr/`.

## Contexts

- [`@hertzg/ip`](./packages/@hertzg/ip/CONTEXT.md) — IPv4 and IPv6 address
  parsing, classification, CIDR utilities, and wire byte conversion.

(Other packages get their own `CONTEXT.md` lazily as terms are resolved during
`/grill-with-docs` sessions.)

## Relationships

Cross-package vocabulary (added as it surfaces).
