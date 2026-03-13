/**
 * Conditional field extension for HomeBank XHB entities.
 *
 * Handles fields that are only present when specific flag bits are set.
 * The primary use case is the `damt` (destination amount) field on
 * operations and archives, which is only serialized when the `OF_ADVXFER`
 * flag bit is set, indicating a cross-currency transfer.
 *
 * In the HomeBank C source (`hb-xml.c`):
 * ```c
 * if(item->flags & OF_ADVXFER)
 *     hb_xml_append_amt(node, "damt", item->xferamount);
 * ```
 *
 * `OF_ADVXFER` is defined as `(1 << 4)` = 16 in `hb-transaction.h`.
 *
 * @module
 */

import type { EntityExtension } from "./types.ts";

/**
 * The `OF_ADVXFER` flag bit value indicating a cross-currency transfer.
 * Defined as `(1 << 4)` in the HomeBank C source (`hb-transaction.h`).
 */
export const OF_ADVXFER = 1 << 4;

/**
 * Parses a conditional amount field from raw XML attributes.
 *
 * If the specified attribute exists, its value is parsed as a float
 * and returned. Otherwise, returns `undefined`.
 *
 * @param attrs Raw XML attribute key-value pairs
 * @param attrName Name of the attribute to look for
 * @returns The parsed amount, or `undefined` if the attribute is absent
 *
 * @example Parse a conditional amount attribute
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseConditionalAmount } from "@hertzg/xhb/extensions/conditional";
 *
 * assertEquals(parseConditionalAmount({ damt: "42.5" }, "damt"), 42.5);
 * assertEquals(parseConditionalAmount({}, "damt"), undefined);
 * ```
 */
export function parseConditionalAmount(
  attrs: Record<string, string>,
  attrName: string,
): number | undefined {
  if (attrName in attrs) {
    return parseFloat(attrs[attrName]) || 0;
  }
  return undefined;
}

/**
 * Serializes a conditional amount field to an XML attribute string.
 *
 * Only emits the attribute if the specified flag bit is set on the
 * entity's `flags` field and the value is not `undefined`.
 *
 * @param entity The entity being serialized
 * @param attrName Name of the XML attribute to produce
 * @param fieldName Name of the entity field containing the amount
 * @param flagsField Name of the entity field containing the flags bitmask
 * @param flagBit The flag bit that must be set for serialization
 * @returns Array containing a single attribute string, or empty array
 *
 * @example Serialize conditional amount with flag check
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   OF_ADVXFER,
 *   serializeConditionalAmount,
 * } from "@hertzg/xhb/extensions/conditional";
 *
 * const entity = { flags: OF_ADVXFER, damt: 42.5 };
 * assertEquals(
 *   serializeConditionalAmount(entity, "damt", "damt", "flags", OF_ADVXFER),
 *   ['damt="42.5"'],
 * );
 *
 * const entityNoFlag = { flags: 0, damt: 42.5 };
 * assertEquals(
 *   serializeConditionalAmount(
 *     entityNoFlag,
 *     "damt",
 *     "damt",
 *     "flags",
 *     OF_ADVXFER,
 *   ),
 *   [],
 * );
 * ```
 */
export function serializeConditionalAmount(
  entity: Record<string, unknown>,
  attrName: string,
  fieldName: string,
  flagsField: string,
  flagBit: number,
): string[] {
  const flags = (entity[flagsField] as number) || 0;
  const value = entity[fieldName];

  if ((flags & flagBit) !== 0 && value !== undefined) {
    return [`${attrName}="${value}"`];
  }
  return [];
}

/**
 * Creates a conditional extension for the `damt` (destination amount) field.
 *
 * During parsing, if a `damt` attribute exists, it is parsed as a number
 * and stored in the entity's `damt` field.
 *
 * During serialization, `damt` is only emitted if the entity's `flags`
 * field has the `OF_ADVXFER` bit (`1 << 4` = 16) set.
 *
 * @returns An {@link EntityExtension} for conditional `damt` handling
 *
 * @example Create and use a conditional damt extension
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   conditionalDamtExtension,
 *   OF_ADVXFER,
 * } from "@hertzg/xhb/extensions/conditional";
 *
 * const ext = conditionalDamtExtension();
 *
 * const entity: Record<string, unknown> = {};
 * ext.parse({ damt: "99.5" }, entity);
 * assertEquals(entity["damt"], 99.5);
 *
 * entity["flags"] = OF_ADVXFER;
 * assertEquals(ext.serialize(entity), ['damt="99.5"']);
 *
 * entity["flags"] = 0;
 * assertEquals(ext.serialize(entity), []);
 * ```
 */
export function conditionalDamtExtension(): EntityExtension {
  return {
    parse(
      attrs: Record<string, string>,
      entity: Record<string, unknown>,
    ): void {
      const value = parseConditionalAmount(attrs, "damt");
      if (value !== undefined) {
        entity["damt"] = value;
      }
    },
    serialize(entity: Record<string, unknown>): string[] {
      return serializeConditionalAmount(
        entity,
        "damt",
        "damt",
        "flags",
        OF_ADVXFER,
      );
    },
  };
}
