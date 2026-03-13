/**
 * Budget array extension for HomeBank XHB category entities.
 *
 * Categories store monthly budget values as individual attributes `b0`
 * through `b12` (13 values: 12 months plus an overall/yearly value at
 * index 0). During serialization, only non-zero budget entries are emitted.
 *
 * In the HomeBank C source, budget values are loaded in
 * `homebank_load_xml_cat` and saved in `homebank_save_xml_cat`.
 *
 * @module
 */

import type { EntityExtension } from "./types.ts";

/** The number of budget slots (b0 through b12 inclusive). */
const BUDGET_COUNT = 13;

/**
 * Parses budget attributes (`b0` through `b12`) from raw XML attributes
 * into an array of 13 numbers.
 *
 * Missing attributes default to 0. The array index corresponds to the
 * attribute suffix (e.g., `b0` maps to index 0).
 *
 * @param attrs Raw XML attribute key-value pairs
 * @returns Array of 13 budget values
 *
 * @example Parse budget attributes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseBudget } from "@hertzg/xhb/extensions/budget";
 *
 * const budget = parseBudget({ b0: "100", b3: "250.50", b12: "50" });
 *
 * assertEquals(budget[0], 100);
 * assertEquals(budget[3], 250.5);
 * assertEquals(budget[12], 50);
 * assertEquals(budget[1], 0);
 * ```
 */
export function parseBudget(attrs: Record<string, string>): number[] {
  const budget: number[] = new Array(BUDGET_COUNT).fill(0);

  for (let i = 0; i < BUDGET_COUNT; i++) {
    const key = `b${i}`;
    if (key in attrs) {
      budget[i] = parseFloat(attrs[key]) || 0;
    }
  }

  return budget;
}

/**
 * Serializes a budget array into XML attribute strings.
 *
 * Only non-zero values are emitted, matching the HomeBank C behavior.
 * Returns an empty array if the budget is empty, undefined, or all zeros.
 *
 * @param budget Array of budget values (up to 13 entries)
 * @returns Array of XML attribute strings for non-zero entries
 *
 * @example Serialize budget to attribute strings
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { serializeBudget } from "@hertzg/xhb/extensions/budget";
 *
 * const budget = [0, 100, 0, 250.5, 0, 0, 0, 0, 0, 0, 0, 0, 50];
 * const attrs = serializeBudget(budget);
 *
 * assertEquals(attrs, [
 *   'b1="100"',
 *   'b3="250.5"',
 *   'b12="50"',
 * ]);
 * ```
 */
export function serializeBudget(budget: number[]): string[] {
  if (!budget || budget.length === 0) {
    return [];
  }

  const attrs: string[] = [];
  const count = Math.min(budget.length, BUDGET_COUNT);

  for (let i = 0; i < count; i++) {
    if (budget[i] !== 0) {
      attrs.push(`b${i}="${budget[i]}"`);
    }
  }

  return attrs;
}

/**
 * Creates a budget extension that parses `b0`..`b12` attributes into a
 * `budget` field on the entity and serializes them back.
 *
 * @returns An {@link EntityExtension} for budget handling
 *
 * @example Create and use a budget extension
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { budgetExtension } from "@hertzg/xhb/extensions/budget";
 *
 * const ext = budgetExtension();
 * const entity: Record<string, unknown> = {};
 * ext.parse({ b0: "100", b6: "200" }, entity);
 *
 * const budget = entity["budget"] as number[];
 * assertEquals(budget[0], 100);
 * assertEquals(budget[6], 200);
 * assertEquals(budget[1], 0);
 *
 * const attrs = ext.serialize(entity);
 * assertEquals(attrs, ['b0="100"', 'b6="200"']);
 * ```
 */
export function budgetExtension(): EntityExtension {
  return {
    parse(
      attrs: Record<string, string>,
      entity: Record<string, unknown>,
    ): void {
      entity["budget"] = parseBudget(attrs);
    },
    serialize(entity: Record<string, unknown>): string[] {
      const budget = entity["budget"];
      if (!Array.isArray(budget)) {
        return [];
      }
      return serializeBudget(budget as number[]);
    },
  };
}
