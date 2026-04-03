// @deno-types="./xml-parser.d.ts"
import type { Node } from "xml-parser";
import { atoi, parseGCharP } from "./_parse.ts";
import { hb_xml_attr_int, hb_xml_attr_txt, hb_xml_tag } from "./_serialize.ts";
import type { gCharP, gUInt32, gUShort } from "./_g_types.ts";

/** A transaction payee from the `<pay>` element. */
export interface Payee {
  /** Unique payee key. */
  key: gUInt32;
  /** Payee name. */
  name: gCharP;
  /** Default payment mode (`PAY_MODE_*` constant). */
  payMode: gUShort;
  /** Default category key for this payee. */
  category: gUInt32;
}

/**
 * Parses a `<pay>` XML node into a {@linkcode Payee} object.
 *
 * @param node - The `<pay>` XML node.
 * @returns The parsed payee.
 */
export function parsePayee({ attributes }: Node): Payee {
  return {
    key: atoi(attributes.key),
    name: parseGCharP(attributes.name),
    payMode: atoi(attributes.paymode),
    category: atoi(attributes.category),
  };
}

/**
 * Serializes a {@linkcode Payee} object into a `<pay ... />` XML tag.
 *
 * @param payee - The payee to serialize.
 * @returns The self-closing XML tag string.
 */
export const serializePayee = (payee: Payee): string =>
  hb_xml_tag(
    "<pay",
    hb_xml_attr_int("key", payee.key),
    hb_xml_attr_txt("name", payee.name),
    hb_xml_attr_int("category", payee.category),
    hb_xml_attr_int("paymode", payee.payMode),
  );
