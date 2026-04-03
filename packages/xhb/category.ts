import type { Node } from "xml-parser";
import { atoi, parseGCharP, parseGDouble } from "./_parse.ts";
import {
  dtostr,
  hb_xml_attr_int,
  hb_xml_attr_txt,
  hb_xml_tag,
} from "./_serialize.ts";
import printj from "printj";
const { sprintf } = printj;
import type { gCharP, gDouble, gUInt32, gUShort } from "./_g_types.ts";

/** A transaction category from the `<cat>` element. */
export interface Category {
  /** Unique category key. */
  key: gUInt32;
  /** Key of the parent category (`0` for top-level). */
  parent: gUInt32;
  /** Bitmask of `CATEGORY_FLAG_*` values. */
  flags: gUShort;
  /** Category name. */
  name: gCharP;
  /** Monthly budget amounts (up to 13 entries, indexed 0-12). */
  budgets: gDouble[];
}

/** Category is a subcategory. */
export const CATEGORY_FLAG_SUB = 1 << 0;
/** Category represents income (vs expense). */
export const CATEGORY_FLAG_INCOME = 1 << 1;
/** Category has been user-customized. */
export const CATEGORY_FLAG_CUSTOM = 1 << 2;
/** Category has budget amounts set. */
export const CATEGORY_FLAG_BUDGET = 1 << 3;
/** Category budget is forced / overridden. */
export const CATEGORY_FLAG_FORCED = 1 << 4;

/**
 * Parses a `<cat>` XML node into a {@linkcode Category} object.
 *
 * @param node - The `<cat>` XML node.
 * @returns The parsed category.
 */
export function parseCategory({ attributes }: Node): Category {
  const budgets: gDouble[] = new Array(12);
  for (let i = 0, ln = 12; i <= ln; i++) {
    const bAttr = `b${i}`;
    if (bAttr in attributes) {
      budgets[i] = parseGDouble(attributes[bAttr]);
    }
  }

  return {
    key: atoi(attributes.key),
    parent: atoi(attributes.parent),
    flags: atoi(attributes.flags),
    name: parseGCharP(attributes.name),
    budgets,
  };
}

const hb_xml_attrs_budgets = (budget: gDouble[]) =>
  Array.isArray(budget)
    ? budget
      .filter((b) => b !== null && b !== undefined)
      .map((v, i) => sprintf('b%d="%s"', i, dtostr(v)))
      .join(" ")
    : "";

/**
 * Serializes a {@linkcode Category} object into a `<cat ... />` XML tag.
 *
 * @param category - The category to serialize.
 * @returns The self-closing XML tag string.
 */
export const serializeCategory = (category: Category): string =>
  hb_xml_tag(
    "<cat",
    hb_xml_attr_int("key", category.key),
    hb_xml_attr_int("parent", category.parent),
    hb_xml_attr_int("flags", category.flags),
    hb_xml_attr_txt("name", category.name),
    hb_xml_attrs_budgets(category.budgets),
  );
