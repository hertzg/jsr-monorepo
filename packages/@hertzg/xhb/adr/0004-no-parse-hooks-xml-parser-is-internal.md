# ADR 0004 — No parse hooks; the XML parser is an internal detail

**Status:** Accepted

**Supersedes:** the `ParseOptions` hooks introduced with the initial public API.

## Context

`parse` accepted a `ParseOptions` object with two hooks:

```ts ignore
export interface ParseOptions {
  onEntity?: <T>(entity: T, node: XmlElement) => T;
  onUnknownNode?: (node: XmlElement) => void;
}
```

Both took an `XmlElement` — a type owned by `@std/xml`. That made `@std/xml`
part of this package's public API surface, and it was the only place where it
was. Everything else about the XML layer is private: `parse`/`isElement` are
used internally, the per-entity `parseX` functions take `XmlElement` but are not
re-exported from `mod.ts`, and `SerializeOptions.onEntity` deals in strings.

The consequences of that single leak were larger than the feature:

- **Type coupling.** A consumer who wanted to write the handler as anything
  other than an inline arrow — a named function, a stored variable, an explicit
  annotation, their own wrapper type — had to add `@std/xml` to their own import
  map to name `XmlElement`.
- **Runtime coupling.** The hooks received the parser's actual node objects, so
  consumers observed `@std/xml`'s representation (`node.name.local`,
  `node.attributes`) directly. A shape change in `@std/xml` therefore became a
  breaking change for _this_ package's consumers, even though the dependency was
  nominally private. That is a real maintenance obligation: every `@std/xml`
  bump has to be reviewed against a contract we never intended to publish.
- **Cost out of proportion to value.** `onEntity` is
  `<T>(entity: T, node: XmlElement) => T`; by parametricity that signature
  promises the hook cannot actually transform anything, so the type never
  described the intended use in the first place. `onUnknownNode` reported nodes
  this library deliberately ignores. Both are escape hatches — the kind of API
  that pins down internals in exchange for a use case nobody has articulated.

## Decision

Remove `ParseOptions` entirely. `parse` takes a single argument:

```ts ignore
export function parse(xml: string): XHB;
```

Unrecognized nodes are ignored silently, as before — the hook only ever observed
that, it never changed it.

`@std/xml` is now a fully internal implementation detail of `@hertzg/xhb`. No
type or value from it appears anywhere in the public surface reported by
`deno doc`.

`SerializeOptions.onEntity` is unaffected: it deals in the entity and its
serialized `string`, so it leaks nothing.

## Consequences

- **Breaking change.** Any caller passing a second argument to `parse` fails to
  compile. There is no deprecation period; the package is small and the hooks
  were undocumented beyond a one-line JSDoc.
- **`@std/xml` can now be upgraded on its own merits.** Its version is a private
  dependency decision, reviewable against this package's tests rather than
  against unknown consumer code.
- **Transformation moves to where it belongs.** A consumer who wants to
  post-process entities can map over `xhb.accounts`, `xhb.operations`, etc.
  after `parse` returns — with fully typed entity objects instead of raw XML
  nodes, which is strictly more ergonomic than the hook was.
- **Observing unknown nodes is no longer possible.** If a real need appears
  (e.g. reporting XHB elements this library does not yet model), it should be
  re-introduced deliberately — reporting a package-owned shape such as the tag
  name and its attributes, never the parser's node type.

## References

- `mod.ts` — `parse`, `SerializeOptions`
- ADR 0001 — Round-trip byte fidelity
- ADR 0003 — Module layout mirrors the C source
