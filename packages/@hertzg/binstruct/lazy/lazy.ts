/**
 * Lazily-built coder for mutually-recursive coder graphs.
 *
 * `lazy()` defers calling its `factory` until the first `encode`/`decode`,
 * then caches the result forever. This breaks the build-time recursion that
 * happens when two or more coders reference each other (`a` needs `b`, `b`
 * needs `a`): without `lazy()`, building either one eagerly walks into the
 * other before it has a value to return, and JavaScript's temporal dead zone
 * turns that into a `ReferenceError` (or, if the cycle is expressed through
 * a factory function instead of a `const`, an unbounded `RangeError: Maximum
 * call stack size exceeded`).
 *
 * `lazy()` does not bound *runtime* recursion. Decoding a self-referential
 * structure still recurses once per level actually present in the input;
 * termination is the protocol's job (a discriminator that stops matching, or
 * the buffer running out), not `lazy()`'s.
 *
 * @example Breaking a build-time cycle between two struct coders
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { struct, lazy, type Coder } from "@hertzg/binstruct";
 * import { u8 } from "@hertzg/binstruct/numeric";
 *
 * interface Ping {
 *   kind: 0;
 *   next: Pong;
 * }
 * interface Pong {
 *   kind: 1;
 *   ttl: number;
 * }
 *
 * // `pingCoder` needs `pongCoder` while building its own `next` field, but
 * // `pongCoder` is declared afterwards and does not exist yet at that point.
 * // Without `lazy()` this is a ReferenceError (reading `pongCoder` inside
 * // its own temporal dead zone) once the graph grows past two coders and
 * // closes an actual cycle, as it does for tunneling protocols.
 * const pingCoder: Coder<Ping> = struct({
 *   kind: u8() as unknown as Coder<0>,
 *   next: lazy(() => pongCoder),
 * });
 *
 * const pongCoder: Coder<Pong> = struct({
 *   kind: u8() as unknown as Coder<1>,
 *   ttl: u8(),
 * });
 *
 * const buffer = new Uint8Array(8);
 * const value: Ping = { kind: 0, next: { kind: 1, ttl: 64 } };
 *
 * const written = pingCoder.encode(value, buffer);
 * const [decoded, read] = pingCoder.decode(buffer);
 *
 * assertEquals(decoded, value);
 * assertEquals(written, read);
 * ```
 *
 * @module
 */

import { type Coder, createContext, kCoderKind } from "../core.ts";
import { refSetValue } from "../ref/ref.ts";

const kKindLazy = Symbol("lazy");

/**
 * Wraps a coder factory so the coder it produces is built on first use
 * instead of when `lazy()` is called, and only ever built once.
 *
 * Use this to close mutually-recursive coder graphs — for example a
 * tunneling protocol whose payload can itself contain the outer protocol
 * (VXLAN carrying Ethernet carrying IPv4 carrying UDP carrying VXLAN again).
 * Writing that graph with plain `const`s is impossible: whichever coder is
 * declared last needs the first one, which is still in its temporal dead
 * zone. Wrapping the back-reference in `lazy(() => firstCoder)` defers
 * reading `firstCoder` until an `encode`/`decode` call actually happens,
 * by which point every top-level `const` in the module has been assigned.
 *
 * The factory is called at most once. Its result is cached and reused for
 * every subsequent `encode`/`decode` on this `lazy()` coder, so building the
 * inner coder graph (e.g. calling `struct()`/`refineSwitch()`) is not
 * repeated per call.
 *
 * @template TDecoded - The type of the value the inner coder decodes to.
 * @param factory - Builds the inner coder. Called at most once, on first
 *   `encode` or `decode`.
 * @returns A `Coder<TDecoded>` that transparently delegates to the coder
 *   `factory` builds.
 *
 * @example Deferring construction until first use
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { lazy } from "@hertzg/binstruct/lazy";
 * import { u16le } from "@hertzg/binstruct/numeric";
 *
 * let builds = 0;
 * const coder = lazy(() => {
 *   builds++;
 *   return u16le();
 * });
 *
 * assertEquals(builds, 0); // not built yet
 *
 * const buffer = new Uint8Array(4);
 * coder.encode(513, buffer);
 * coder.decode(buffer);
 * coder.encode(7, buffer);
 *
 * assertEquals(builds, 1); // built once, then memoized
 * ```
 */
export function lazy<TDecoded>(
  factory: () => Coder<TDecoded>,
): Coder<TDecoded> {
  let inner: Coder<TDecoded> | undefined;
  const resolve = (): Coder<TDecoded> => {
    if (inner === undefined) {
      inner = factory();
    }
    return inner;
  };

  let self: Coder<TDecoded>;
  return self = {
    [kCoderKind]: kKindLazy,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      const bytesWritten = resolve().encode(decoded, target, ctx);
      refSetValue(ctx, self, decoded);
      return bytesWritten;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      const [decoded, bytesRead] = resolve().decode(encoded, ctx);
      refSetValue(ctx, self, decoded);
      return [decoded, bytesRead];
    },
  };
}
