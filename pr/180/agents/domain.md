# Domain Docs

How the engineering skills should consume this repo's domain documentation
when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root if it exists — points at one
  `CONTEXT.md` per context. Read each one relevant to the topic.
- **`packages/<scope>/<name>/CONTEXT.md`** for the package(s) you're
  working in.
- **`adr/`** at the repo root — repo-wide decisions (tooling, conventions,
  monorepo structure).
- **`packages/<scope>/<name>/adr/`** — package-specific decisions
  (binstruct, ip, png, routeros-api, tplink-api, xhb each have their own).

If any of these files don't exist, **proceed silently**. Don't flag their
absence; don't suggest creating them upfront. The producer skill
(`/grill-with-docs`) creates them lazily when terms or decisions actually
get resolved.

## File structure (this repo — multi-context)

```
/
├── CONTEXT-MAP.md                                   ← created lazily
├── adr/                                             ← repo-wide decisions
│   ├── 0001-bare-imports-via-import-map.md
│   ├── …
│   └── 0010-sub-entrypoint-exports.md
└── packages/
    ├── @hertzg/
    │   ├── binstruct/
    │   │   ├── CONTEXT.md                           ← created lazily
    │   │   ├── adr/                                 ← package decisions
    │   │   └── …
    │   ├── ip/
    │   │   ├── CONTEXT.md                           ← created lazily
    │   │   └── adr/
    │   └── …
    └── @binstruct/
        ├── png/
        │   └── adr/
        └── …
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor
proposal, a hypothesis, a test name), use the term as defined in
`CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal —
either you're inventing language the project doesn't use (reconsider) or
there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather
than silently overriding:

> _Contradicts repo ADR 0006 (no defensive programming) — but worth
> reopening because…_

When citing an ADR, qualify the scope: "**repo ADR 0009**" for root-level,
"**`@hertzg/binstruct` ADR 0005**" for package-level. ADR numbers reset per
scope.
