/**
 * Builds a {@linkcode Refiner} that swaps one or more `Uint8Array` fields of
 * a host record for typed values produced by per-field sub-coders.
 *
 * Useful for layered binary formats where a host record carries a payload
 * (or several) as raw bytes that should be interpreted via a nested coder.
 * Common case: an Ethernet frame's `payload` field holds an IPv4 datagram,
 * an ICMP packet, or another layer's wire bytes — `refineFields` lets you
 * surface the typed value in place without rewriting the host coder.
 *
 * Each entry in the `coders` map names a host field whose value is a
 * `Uint8Array` and the coder used to decode/encode that field's bytes.
 * Fields not listed are forwarded unchanged.
 *
 * @example Refine a single field
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bytes, refine, refineFields, struct, u16be, u8 } from "@hertzg/binstruct";
 *
 * const inner = struct({ a: u8(), b: u8() });
 * const outer = struct({ tag: u16be(), payload: bytes(2) });
 *
 * const coder = refine(outer, refineFields({ payload: inner }))();
 * const buffer = new Uint8Array(4);
 *
 * coder.encode({ tag: 0xbeef, payload: { a: 1, b: 2 } }, buffer);
 * const [decoded] = coder.decode(buffer);
 *
 * assertEquals(decoded, { tag: 0xbeef, payload: { a: 1, b: 2 } });
 * ```
 *
 * @example Refine multiple fields in one pass
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bytes, refine, refineFields, struct, u16be } from "@hertzg/binstruct";
 *
 * const word = struct({ value: u16be() });
 * const host = struct({ a: bytes(2), b: bytes(2) });
 *
 * const coder = refine(host, refineFields({ a: word, b: word }))();
 * const buffer = new Uint8Array(4);
 *
 * coder.encode({ a: { value: 0x1234 }, b: { value: 0x5678 } }, buffer);
 * const [decoded] = coder.decode(buffer);
 *
 * assertEquals(decoded.a.value, 0x1234);
 * assertEquals(decoded.b.value, 0x5678);
 * ```
 *
 * @module
 */

import type { Coder } from "../core.ts";
import { decode, encode } from "../helpers.ts";
import type { Refiner } from "./refine.ts";

/**
 * Map of host field names to the sub-coder that decodes/encodes that field's
 * bytes. Used as the input to {@linkcode refineFields}.
 *
 * The element coder is `Coder<any>` so refiners with mixed inner-payload
 * types compose without forcing the caller to widen each entry. The
 * decoded value type for each field is recovered via {@linkcode DecodedFields}.
 */
// deno-lint-ignore no-explicit-any
export type FieldCoders = Record<string, Coder<any>>;

/**
 * Mapped type extracting the decoded value type for each entry in a
 * {@linkcode FieldCoders} map. Given `{ payload: Coder<Ipv4> }` it yields
 * `{ payload: Ipv4 }`.
 */
export type DecodedFields<TCoders extends FieldCoders> = {
  [K in keyof TCoders]: TCoders[K] extends Coder<infer T> ? T : never;
};

/**
 * Creates a {@linkcode Refiner} that swaps named `Uint8Array` fields of a
 * host record for the typed values produced by their sub-coders. Fields not
 * in `coders` are passed through unchanged.
 *
 * Pair with {@linkcode refine} to apply the refinement to a host coder, or
 * use as an arm of {@linkcode refineSwitch} for layered formats where the
 * host's discriminator picks which sub-coder to use.
 *
 * @template TCoders - Map of field name to sub-coder.
 * @template THost - Host record; constrained so each refined field is
 *   `Uint8Array` on the unrefined side.
 *
 * @param coders - Map of field names to per-field sub-coders.
 * @returns A refiner from `THost` to `THost` with the listed fields replaced
 *   by their decoded values.
 *
 * @example Refine a payload field with a nested coder
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bytes, refine, refineFields, struct, u16be, u8 } from "@hertzg/binstruct";
 *
 * const inner = struct({ a: u8(), b: u8() });
 * const outer = struct({ tag: u16be(), payload: bytes(2) });
 *
 * const coder = refine(outer, refineFields({ payload: inner }))();
 * const buffer = new Uint8Array(4);
 *
 * coder.encode({ tag: 0xbeef, payload: { a: 1, b: 2 } }, buffer);
 * const [decoded] = coder.decode(buffer);
 *
 * assertEquals(decoded, { tag: 0xbeef, payload: { a: 1, b: 2 } });
 * ```
 */
export function refineFields<
  TCoders extends FieldCoders,
  THost extends { [K in keyof TCoders]: Uint8Array },
>(
  coders: TCoders,
): Refiner<THost, Omit<THost, keyof TCoders> & DecodedFields<TCoders>, []> {
  type TRefined = Omit<THost, keyof TCoders> & DecodedFields<TCoders>;
  const fields = Object.keys(coders);
  return {
    refine: (host, ctx) => {
      const out: Record<string, unknown> = { ...host };
      for (const field of fields) {
        out[field] = decode(
          coders[field],
          host[field as keyof THost] as Uint8Array,
          ctx,
        );
      }
      return out as TRefined;
    },
    unrefine: (refined, ctx) => {
      const out: Record<string, unknown> = { ...refined };
      for (const field of fields) {
        out[field] = encode(
          coders[field],
          (refined as Record<string, unknown>)[field],
          ctx,
        );
      }
      return out as THost;
    },
  };
}
