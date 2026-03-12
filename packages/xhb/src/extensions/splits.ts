/**
 * Split transaction extension for HomeBank XHB entities.
 *
 * Handles the `scat`, `samt`, and `smem` XML attributes that encode split
 * transactions using `||` as a delimiter. Used by both operations (`<ope>`)
 * and archives/templates (`<fav>`).
 *
 * In the HomeBank C source, splits are parsed via `da_splits_parse` and
 * serialized via `da_splits_tostring`, both using `||` as the field separator.
 *
 * @module
 */

import type { EntityExtension } from "./types.ts";

/** A single split entry within a transaction. */
export interface Split {
  /** Category key for this split. */
  cat: number;
  /** Amount for this split. */
  amt: number;
  /** Memo/description for this split. */
  mem: string;
}

/**
 * Parses split attributes (`scat`, `samt`, `smem`) from raw XML attributes
 * into a structured array of split entries.
 *
 * Each attribute contains values separated by `||`. The arrays must have
 * matching lengths. If none of the split attributes are present, returns
 * an empty array.
 *
 * @param attrs Raw XML attribute key-value pairs
 * @returns Array of parsed split entries
 *
 * @example Parse split attributes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseSplits } from "@hertzg/xhb/extensions/splits";
 *
 * const splits = parseSplits({
 *   scat: "1||2||3",
 *   samt: "10.5||20.3||30.0",
 *   smem: "groceries||rent||utilities",
 * });
 *
 * assertEquals(splits, [
 *   { cat: 1, amt: 10.5, mem: "groceries" },
 *   { cat: 2, amt: 20.3, mem: "rent" },
 *   { cat: 3, amt: 30.0, mem: "utilities" },
 * ]);
 * ```
 */
export function parseSplits(
  attrs: Record<string, string>,
): Split[] {
  const scat = attrs["scat"];
  const samt = attrs["samt"];
  const smem = attrs["smem"];

  if (scat === undefined && samt === undefined && smem === undefined) {
    return [];
  }

  const cats = (scat ?? "").split("||");
  const amts = (samt ?? "").split("||");
  const mems = (smem ?? "").split("||");

  const count = amts.length;
  const splits: Split[] = [];

  for (let i = 0; i < count; i++) {
    splits.push({
      cat: parseInt(cats[i] ?? "0", 10) || 0,
      amt: parseFloat(amts[i] ?? "0") || 0,
      mem: mems[i] ?? "",
    });
  }

  return splits;
}

/**
 * Serializes an array of split entries into XML attribute strings.
 *
 * Produces `scat`, `samt`, and `smem` attributes with values separated
 * by `||`. Returns an empty array if splits is empty or undefined.
 *
 * @param splits Array of split entries to serialize
 * @returns Array of XML attribute strings
 *
 * @example Serialize splits to attribute strings
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { serializeSplits } from "@hertzg/xhb/extensions/splits";
 *
 * const attrs = serializeSplits([
 *   { cat: 1, amt: 10.5, mem: "groceries" },
 *   { cat: 2, amt: 20.3, mem: "rent" },
 * ]);
 *
 * assertEquals(attrs, [
 *   'scat="1||2"',
 *   'samt="10.5||20.3"',
 *   'smem="groceries||rent"',
 * ]);
 * ```
 */
export function serializeSplits(splits: Split[]): string[] {
  if (!splits || splits.length === 0) {
    return [];
  }

  const cats = splits.map((s) => String(s.cat)).join("||");
  const amts = splits.map((s) => String(s.amt)).join("||");
  const mems = splits.map((s) => s.mem).join("||");

  return [
    `scat="${cats}"`,
    `samt="${amts}"`,
    `smem="${mems}"`,
  ];
}

/**
 * Creates a splits extension that parses `scat`/`samt`/`smem` attributes
 * into a `splits` field on the entity and serializes them back.
 *
 * @returns An {@link EntityExtension} for split handling
 *
 * @example Create and use a splits extension
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { splitsExtension } from "@hertzg/xhb/extensions/splits";
 *
 * const ext = splitsExtension();
 * const entity: Record<string, unknown> = {};
 * ext.parse({ scat: "5||10", samt: "1.5||2.5", smem: "a||b" }, entity);
 *
 * assertEquals(entity["splits"], [
 *   { cat: 5, amt: 1.5, mem: "a" },
 *   { cat: 10, amt: 2.5, mem: "b" },
 * ]);
 *
 * const attrs = ext.serialize(entity);
 * assertEquals(attrs, [
 *   'scat="5||10"',
 *   'samt="1.5||2.5"',
 *   'smem="a||b"',
 * ]);
 * ```
 */
export function splitsExtension(): EntityExtension {
  return {
    parse(
      attrs: Record<string, string>,
      entity: Record<string, unknown>,
    ): void {
      entity["splits"] = parseSplits(attrs);
    },
    serialize(entity: Record<string, unknown>): string[] {
      const splits = entity["splits"];
      if (!Array.isArray(splits)) {
        return [];
      }
      return serializeSplits(splits as Split[]);
    },
  };
}
