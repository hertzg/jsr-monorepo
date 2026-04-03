// @deno-types="./xml-parser.d.ts"
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

/** A bank account from the `<account>` element. */
export interface Account {
  /** Unique account key. */
  key: gUInt32;
  /** Bitmask of `ACCOUNT_FLAG_*` values. */
  flags: gUShort;
  /** Display order position. */
  displayPosition: gUInt32;
  /** Account type (`ACCOUNT_TYPE_*` constant). */
  type: number;
  /** Key of the associated currency. */
  currency: gUInt32;
  /** Account name. */
  name: gCharP;
  /** Bank account number. */
  bankNumber: gCharP;
  /** Name of the bank. */
  bankName: gCharP;
  /** Initial / starting balance. */
  startingBalance: gDouble;
  /** Overdraft limit (minimum balance). */
  overdraftLimit: gDouble;
  /** First cheque book number. */
  chequeBookNumber1: gUInt32;
  /** Second cheque book number. */
  chequeBookNumber2: gUInt32;
  /** Free-text notes (may contain special characters). */
  notes: gCharP;
  /** Key of the default transaction template. */
  defaultTemplate: gUInt32;
}

/** @deprecated Legacy budget flag (pre-5.x). */
export const ACCOUNT_FLAG_OLDBUDGE = 1 << 0;
/** Account is closed. */
export const ACCOUNT_FLAG_CLOSED = 1 << 1;
/** Account was recently added (temporary flag). */
export const ACCOUNT_FLAG_ADDED = 1 << 2;
/** Account was recently changed (temporary flag). */
export const ACCOUNT_FLAG_CHANGED = 1 << 3;
/** Exclude from summary. */
export const ACCOUNT_FLAG_NOSUMMAR = 1 << 4;
/** Exclude from budget. */
export const ACCOUNT_FLAG_NOBUDGET = 1 << 5;
/** Exclude from reports. */
export const ACCOUNT_FLAG_NOREPORT = 1 << 6;

/** No account type. */
export const ACCOUNT_TYPE_NONE = 0;
/** Bank account. */
export const ACCOUNT_TYPE_BANK = 1;
/** Cash account. */
export const ACCOUNT_TYPE_CASH = 2;
/** Asset account. */
export const ACCOUNT_TYPE_ASSET = 3;
/** Credit card account. */
export const ACCOUNT_TYPE_CREDITCARD = 4;
/** Liability (debt) account. */
export const ACCOUNT_TYPE_LIABILITY = 5;

/**
 * Parses an `<account>` XML node into an {@linkcode Account} object.
 *
 * @param node - The `<account>` XML node.
 * @returns The parsed account.
 */
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

/**
 * Serializes an {@linkcode Account} object into an `<account ... />` XML tag.
 *
 * @param account - The account to serialize.
 * @returns The self-closing XML tag string.
 */
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
