# ADR 0006 — `array()` is a typed polymorphic dispatcher

**Status:** Accepted

## Context

Array layouts in binary formats come in three common flavors:

- **Length-prefixed**: `[u16 count][N items]`
- **Fixed-length**: known count from elsewhere — a literal, or a `ref`
  to an earlier field
- **Conditional**: read items while a predicate holds (sentinel-
  terminated, end-of-buffer, predicate over the decoded value)

Three separate functions exist (`arrayLP`, `arrayFL`, `arrayWhile`) and
remain exported for callers who want to be explicit. But most call sites
don't care which kind they got — they want "make an array of this." A
single `array()` that picks based on argument type is the ergonomic
surface.

A string-flag overload (`array(elem, "lp", u16le())`) was rejected per
the user memory feedback `feedback_no_string_overloads.md`: convenience
overloads that switch on string modes mask intent and fight with type
inference.

## Decision

`array(elementType, x)` dispatches on the **type** of `x`:

| `x` type                         | Dispatches to | Behavior                       |
| -------------------------------- | ------------- | ------------------------------ |
| `Coder<number>`                  | `arrayLP`     | length-prefixed                |
| `LengthOrRef` (number or RefValue) | `arrayFL`   | fixed length                   |
| `(state) => boolean`             | `arrayWhile`  | conditional                    |

Three TypeScript overloads keep the return type tight. The runtime
discriminator is `isLengthOrRef(x) || isCoder<number>(x)`; if neither, it
must be a function and is treated as the while-condition.

```ts
array(u8(), u32le())                  // length-prefixed: u32 count + bytes
array(u8(), 16)                       // fixed: 16 bytes
array(u8(), ref(lengthCoder))         // fixed, length from earlier field
array(u8(), ({ index }) => index < 4) // while: 4 iterations
```

## Consequences

- **One name to remember**, three behaviors.
- **Type-safety overloads, not string-mode overloads.** The TS type of
  the second argument decides everything; no magic strings.
- **`arrayLP`, `arrayFL`, `arrayWhile` stay exported** for callers who
  want the explicit version (clearer in JSDoc, easier to grep).
- **Adding a fourth array kind** = adding a fourth overload, a fourth
  runtime branch, and a fourth `arrayX` export.
- **Ambiguity is impossible** because `Coder<number>`, `LengthOrRef`,
  and function are runtime-distinguishable: `isCoder()` matches a
  coder, `isLengthOrRef()` matches a number or ref-tagged function,
  and a while-condition is a plain function.

## References

- `array/array.ts` — `array` overloads, dispatch logic
- `array/length-prefixed.ts`, `array/fixed-length.ts`,
  `array/conditional-while.ts`
- User memory: `feedback_no_string_overloads.md`
