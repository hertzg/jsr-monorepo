import type { Node } from "xml-parser";
import { atoi, parseGCharP } from "./_parse.ts";
import type { VolatileXHB } from "./mod.ts";
import { hb_xml_attr_int, hb_xml_attr_txt, hb_xml_tag } from "./_serialize.ts";
import type { gCharP, gUInt32, gUShort } from "./_g_types.ts";

export interface Assign {
  key: gUInt32;
  flags: gUShort;
  field: gUShort;
  name: gCharP;
  payee: gUInt32;
  category: gUInt32;
  payMode: number;
}

export const ASSIGN_FIELD_MEMO = 0;
export const ASSIGN_FIELD_PAYEE = 1;

export const ASSIGN_FLAG_EXACT = 1 << 0;
export const ASSIGN_FLAG_DOPAY = 1 << 1;
export const ASSIGN_FLAG_DOCAT = 1 << 2;
export const ASSIGN_FLAG_DOMOD = 1 << 3;
export const ASSIGN_FLAG_REGEX = 1 << 8;
export const ASSIGN_FLAG_OVWPAY = 1 << 9;
export const ASSIGN_FLAG_OVWCAT = 1 << 10;
export const ASSIGN_FLAG_OVWMOD = 1 << 11;

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
