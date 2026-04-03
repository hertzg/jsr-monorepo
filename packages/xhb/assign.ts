import type { Node } from "xml-parser";
import { atoi, parseGCharP } from "./_parse.ts";
import type { VolatileXHB } from "./mod.ts";
import { hb_xml_attr_int, hb_xml_attr_txt, hb_xml_tag } from "./_serialize.ts";
import type { gCharP, gUInt32, gUShort } from "./_g_types.ts";

/** An auto-assignment rule from the `<asg>` element. */
export interface Assign {
  /** Unique assign key. */
  key: gUInt32;
  /** Bitmask of `ASSIGN_FLAG_*` values. */
  flags: gUShort;
  /** Field to match against (`ASSIGN_FIELD_*` constant). */
  field: gUShort;
  /** Pattern to match (text or regex depending on flags). */
  name: gCharP;
  /** Key of the payee to assign. */
  payee: gUInt32;
  /** Key of the category to assign. */
  category: gUInt32;
  /** Payment mode to assign (`PAY_MODE_*` constant). */
  payMode: number;
}

/** Match against the memo field. */
export const ASSIGN_FIELD_MEMO = 0;
/** Match against the payee name. */
export const ASSIGN_FIELD_PAYEE = 1;

/** Require exact match. */
export const ASSIGN_FLAG_EXACT = 1 << 0;
/** Assign payee on match. */
export const ASSIGN_FLAG_DOPAY = 1 << 1;
/** Assign category on match. */
export const ASSIGN_FLAG_DOCAT = 1 << 2;
/** Assign payment mode on match. */
export const ASSIGN_FLAG_DOMOD = 1 << 3;
/** Pattern is a regular expression. */
export const ASSIGN_FLAG_REGEX = 1 << 8;
/** Overwrite existing payee. */
export const ASSIGN_FLAG_OVWPAY = 1 << 9;
/** Overwrite existing category. */
export const ASSIGN_FLAG_OVWCAT = 1 << 10;
/** Overwrite existing payment mode. */
export const ASSIGN_FLAG_OVWMOD = 1 << 11;

/**
 * Parses an `<asg>` XML node into an {@linkcode Assign} object.
 *
 * For files with format version <= 0.7, the `exact` attribute is migrated
 * into the flags bitmask.
 *
 * @param node - The `<asg>` XML node.
 * @param xhb - The partially-parsed XHB (needed for version check).
 * @returns The parsed assign rule.
 */
export function parseAssign({ attributes }: Node, xhb: VolatileXHB): Assign {
  const entry: Assign = {
    key: atoi(attributes.key),
    flags: atoi(attributes.flags),
    field: atoi(attributes.field),
    name: parseGCharP(attributes.name),
    payee: atoi(attributes.payee),
    category: atoi(attributes.category),
    payMode: atoi(attributes.paymode),
  };

  /* in v08 exact moved to flag */
  if (parseFloat(xhb.versions.file) <= 0.7) {
    entry.flags = ASSIGN_FLAG_DOCAT | ASSIGN_FLAG_DOPAY;
    if (typeof attributes.exact !== "undefined" && atoi(attributes.exact) > 0) {
      entry.flags |= ASSIGN_FLAG_EXACT;
    }
  }

  return entry;
}

/**
 * Serializes an {@linkcode Assign} object into an `<asg ... />` XML tag.
 *
 * @param assign - The assign rule to serialize.
 * @returns The self-closing XML tag string.
 */
export const serializeAssign = (assign: Assign): string =>
  hb_xml_tag(
    "<asg",
    hb_xml_attr_int("key", assign.key),
    hb_xml_attr_int("flags", assign.flags),
    hb_xml_attr_int("field", assign.field),
    hb_xml_attr_txt("name", assign.name),
    hb_xml_attr_int("payee", assign.payee),
    hb_xml_attr_int("category", assign.category),
    hb_xml_attr_int("paymode", assign.payMode),
  );
