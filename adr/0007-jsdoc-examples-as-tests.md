# ADR 0007 — JSDoc examples are executable tests

**Status:** Accepted

## Context

Documentation drifts from implementation. For libraries where correctness
depends on exact byte layouts and type signatures, a stale example silently
misleads users. Deno's `deno test --doc` lifts fenced code blocks in JSDoc
into real tests, which makes drift impossible if examples are written as
runnable assertions.

## Decision

Every exported member has JSDoc with at least one `@example` block.

Examples are full programs with imports and `assert*` calls — they must
compile and pass under `deno task test`. `console.log` and explanatory
comments-in-place-of-assertions are not used. Use `// deno-fmt-ignore` only
where byte-array layout aids readability.

Standard structure:

````typescript ignore
/**
 * Function description.
 *
 * @param param Description.
 * @returns Return value description.
 *
 * @example Brief example description
 * ```ts ignore
 * import { assertEquals } from "@std/assert";
 * import { func } from "@hertzg/package";
 *
 * const result = func(input);
 * assertEquals(result, expected);
 * ```
 */
````

Use `assertEquals`, `assertThrows`, `assertRejects` from `@std/assert`.

## Consequences

- Examples cannot silently rot — they break CI.
- Writing a new public function means writing a runnable example.
- Adds CI runtime; the test task is split into doc and parallel subtasks
  to keep wall time reasonable.
- For binary codecs, round-trip examples (encode → decode → assert
  equality) are the canonical form.

## References

- AGENTS.md "Documentation Requirements" and "Example Quality"
- `deno task test` (runs `deno test --doc`)
