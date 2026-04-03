import type { Node } from "xml-parser";
import { atoi, parseGCharP, parseGDouble } from "./_parse.ts";
import {
  hb_xml_attr_amt,
  hb_xml_attr_int,
  hb_xml_attr_txt,
  hb_xml_attr_txt_crlf,
  hb_xml_tag,
} from "./_serialize.ts";
import type { gCharP, gDouble, gUInt32, gUShort } from "./_g_types.ts";

export interface Account {
  key: gUInt32;
  flags: gUShort;
  displayPosition: gUInt32;
  type: number;
  currency: gUInt32;
  name: gCharP;
  bankNumber: gCharP;
  bankName: gCharP;
  startingBalance: gDouble;
  overdraftLimit: gDouble;
  chequeBookNumber1: gUInt32;
  chequeBookNumber2: gUInt32;
  notes: gCharP;
  defaultTemplate: gUInt32;
}

export const ACCOUNT_FLAG_OLDBUDGE = 1 << 0;
export const ACCOUNT_FLAG_CLOSED = 1 << 1;
export const ACCOUNT_FLAG_ADDED = 1 << 2;
export const ACCOUNT_FLAG_CHANGED = 1 << 3;
export const ACCOUNT_FLAG_NOSUMMAR = 1 << 4;
export const ACCOUNT_FLAG_NOBUDGET = 1 << 5;
export const ACCOUNT_FLAG_NOREPORT = 1 << 6;

export const ACCOUNT_TYPE_NONE = 0;
export const ACCOUNT_TYPE_BANK = 1;
export const ACCOUNT_TYPE_CASH = 2;
export const ACCOUNT_TYPE_ASSET = 3;
export const ACCOUNT_TYPE_CREDITCARD = 4;
export const ACCOUNT_TYPE_LIABILITY = 5;

export function parseAccount({ attributes }: Node): Account {
  return {
    key: atoi(attributes.key),
    flags: atoi(attributes.flags),
    displayPosition: atoi(attributes.pos),
    type: atoi(attributes.type),
    currency: atoi(attributes.curr),
    name: parseGCharP(attributes.name),
    bankNumber: parseGCharP(attributes.number),
    bankName: parseGCharP(attributes.bankname),
    startingBalance: parseGDouble(attributes.initial),
    overdraftLimit: parseGDouble(attributes.minimum),
    chequeBookNumber1: atoi(attributes.cheque1),
    chequeBookNumber2: atoi(attributes.cheque2),
    notes: parseGCharP(attributes.notes),
    defaultTemplate: atoi(attributes.tpl),
  };
}

export const serializeAccount = (account: Account): string =>
  hb_xml_tag(
    "<account",
    hb_xml_attr_int("key", account.key),
    hb_xml_attr_int("flags", account.flags),
    hb_xml_attr_int("pos", account.displayPosition),
    hb_xml_attr_int("type", account.type),
    hb_xml_attr_int("curr", account.currency),
    hb_xml_attr_txt("name", account.name),
    hb_xml_attr_txt("number", account.bankNumber),
    hb_xml_attr_txt("bankname", account.bankName),
    hb_xml_attr_amt("initial", account.startingBalance),
    hb_xml_attr_amt("minimum", account.overdraftLimit),
    hb_xml_attr_int("cheque1", account.chequeBookNumber1),
    hb_xml_attr_int("cheque2", account.chequeBookNumber2),
    hb_xml_attr_txt_crlf("notes", account.notes),
    hb_xml_attr_int("tpl", account.defaultTemplate),
  );
