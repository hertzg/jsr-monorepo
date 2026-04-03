/**
 * Parse and serialize HomeBank XHB files.
 *
 * XHB is the XML-based file format used by
 * {@link https://www.gethomebank.org/ | HomeBank}, an open-source personal
 * finance application. This module provides bidirectional conversion between
 * XHB XML and typed JavaScript objects, preserving byte-for-byte fidelity on
 * round-trip.
 *
 * ## Features
 *
 * - **Parse** XHB XML into a typed {@linkcode XHB} object
 * - **Serialize** an {@linkcode XHB} object back to XML
 * - All HomeBank entity types: accounts, archives, assigns, categories,
 *   currencies, operations, payees, properties, tags
 * - Hooks for custom entity processing via {@linkcode ParseOptions.onEntity}
 *   and {@linkcode SerializeOptions.onEntity}
 *
 * @module
 */

import XMLParser, { type Node } from "xml-parser";
import {
  parseProperties,
  type Properties,
  serializeProperties,
} from "./properties.ts";
import {
  type Category,
  parseCategory,
  serializeCategory,
} from "./category.ts";
import { parsePayee, type Payee, serializePayee } from "./payee.ts";
import { type Assign, parseAssign, serializeAssign } from "./assign.ts";
import {
  type Account,
  parseAccount,
  serializeAccount,
} from "./account.ts";
import {
  parseVersions,
  serializeVersions,
  type Versions,
} from "./versions.ts";
import {
  type Currency,
  parseCurrency,
  serializeCurrency,
} from "./currency.ts";
import { parseTag, serializeTag, type Tag } from "./tag.ts";
import {
  type Archive,
  parseArchive,
  serializeArchive,
} from "./archive.ts";
import {
  type Operation,
  parseOperation,
  serializeOperation,
} from "./operation.ts";

export interface XHB {
  versions: Versions;
  properties?: Properties;
  accounts: Account[];
  archives: Archive[];
  assigns: Assign[];
  categories: Category[];
  currencies: Currency[];
  operations: Operation[];
  payees: Payee[];
  tags: Tag[];
}

export type VolatileXHB = Pick<XHB, "versions"> &
  Partial<Omit<XHB, "versions">>;

const NODE_NAME_ACCOUNT = "account";
const NODE_NAME_ARCHIVE = "fav";
const NODE_NAME_ASSIGN = "asg";
const NODE_NAME_PAYEE = "pay";
const NODE_NAME_PROPERTIES = "properties";
const NODE_NAME_CATEGORY = "cat";
const NODE_NAME_CURRENCY = "cur";
const NODE_NAME_TAG = "tag";
const NODE_NAME_OPERATION = "ope";

export interface ParseOptions {
  onEntity?: <T>(entity: T, node: Node) => T;
  onUnknownNode?: (node: Node) => void;
}

const defaultParseOnEntity = <T>(entity: T): T => entity;
const defaultParseOnUnknownNode = (): void => undefined;

export function parse(xml: string, options: ParseOptions = {}): XHB {
  const doc = XMLParser(xml),
    opts: Required<ParseOptions> = {
      onEntity: options.onEntity || defaultParseOnEntity,
      onUnknownNode: options.onUnknownNode || defaultParseOnUnknownNode,
    };

  const xhb: XHB = {
    versions: parseVersions(doc.root),
    properties: undefined,
    accounts: [],
    archives: [],
    assigns: [],
    categories: [],
    currencies: [],
    operations: [],
    payees: [],
    tags: [],
  };

  doc.root.children.forEach((node: Node) => {
    switch (node.name) {
      case NODE_NAME_ACCOUNT:
        xhb.accounts.push(opts.onEntity(parseAccount(node), node));
        break;
      case NODE_NAME_ARCHIVE:
        xhb.archives.push(opts.onEntity(parseArchive(node), node));
        break;
      case NODE_NAME_ASSIGN:
        xhb.assigns.push(opts.onEntity(parseAssign(node, xhb), node));
        break;
      case NODE_NAME_PAYEE:
        xhb.payees.push(opts.onEntity(parsePayee(node), node));
        break;
      case NODE_NAME_PROPERTIES:
        xhb.properties = opts.onEntity(parseProperties(node), node);
        break;
      case NODE_NAME_CATEGORY:
        xhb.categories.push(opts.onEntity(parseCategory(node), node));
        break;
      case NODE_NAME_CURRENCY:
        xhb.currencies.push(opts.onEntity(parseCurrency(node), node));
        break;
      case NODE_NAME_TAG:
        xhb.tags.push(opts.onEntity(parseTag(node), node));
        break;
      case NODE_NAME_OPERATION:
        xhb.operations.push(opts.onEntity(parseOperation(node), node));
        break;
      default:
        opts.onUnknownNode(node);
    }
  });

  return xhb;
}

export interface SerializeOptions {
  onEntity?: <T>(entity: T, serialized: string) => string;
}

const defaultSerializeOnEntity = (_entity: unknown, serialized: string) =>
  serialized;

export const serialize = (xhb: XHB, options: SerializeOptions = {}): string => {
  const opts: Required<SerializeOptions> = {
    onEntity: options.onEntity || defaultSerializeOnEntity,
  };

  const mapAndConcat = <T>(
    array: T[],
    mapFn: (entry: T, ...args: unknown[]) => string,
    glue = "\n",
  ) =>
    array && Array.isArray(array)
      ? array
        .map((entry, ...args) => opts.onEntity(entry, mapFn(entry, ...args)))
        .join(glue)
      : "";

  return [
    '<?xml version="1.0"?>',
    opts.onEntity(xhb.versions, serializeVersions(xhb.versions)),
    opts.onEntity(
      xhb.properties,
      xhb.properties !== undefined ? serializeProperties(xhb.properties) : "",
    ),
    mapAndConcat(xhb.currencies, serializeCurrency),
    mapAndConcat(xhb.accounts, serializeAccount),
    mapAndConcat(xhb.payees, serializePayee),
    mapAndConcat(xhb.categories, serializeCategory),
    mapAndConcat(xhb.tags, serializeTag),
    mapAndConcat(xhb.assigns, serializeAssign),
    mapAndConcat(xhb.archives, serializeArchive),
    mapAndConcat(xhb.operations, serializeOperation),
    "</homebank>\n",
  ]
    .filter((line) => line && line.length)
    .join("\n");
};

// Entity types
export type { Account } from "./account.ts";
export type { Archive, ArchiveSplit } from "./archive.ts";
export type { Assign } from "./assign.ts";
export type { Category } from "./category.ts";
export type { Currency } from "./currency.ts";
export type { Operation, OperationSplit } from "./operation.ts";
export type { Payee } from "./payee.ts";
export type { Properties } from "./properties.ts";
export type { Tag } from "./tag.ts";
export type { Versions } from "./versions.ts";

// GLib type aliases
export type {
  gBoolean,
  gCharP,
  gDouble,
  gInt,
  gShort,
  gUInt32,
  gUShort,
} from "./_g_types.ts";

// Parse helpers
export { atoi, parseGCharP, parseGDouble, parseGInt, parseGUInt32 } from "./_parse.ts";

// Serialize helpers
export {
  dtostr,
  hb_escape_text,
  hb_xml_attr_amt,
  hb_xml_attr_int,
  hb_xml_attr_int0,
  hb_xml_attr_txt,
  hb_xml_attr_txt_crlf,
  hb_xml_attrs_splits,
  hb_xml_tag,
  tags_toStr,
} from "./_serialize.ts";
export type { AttrSplit } from "./_serialize.ts";

// Entity parse/serialize functions
export { parseAccount, serializeAccount } from "./account.ts";
export { parseArchive, serializeArchive } from "./archive.ts";
export { parseAssign, serializeAssign } from "./assign.ts";
export { parseCategory, serializeCategory } from "./category.ts";
export { parseCurrency, serializeCurrency } from "./currency.ts";
export { parseOperation, serializeOperation } from "./operation.ts";
export { parsePayee, serializePayee } from "./payee.ts";
export { parseProperties, serializeProperties } from "./properties.ts";
export { parseTag, serializeTag } from "./tag.ts";
export { parseVersions, serializeVersions } from "./versions.ts";

// Account constants
export {
  ACCOUNT_FLAG_ADDED,
  ACCOUNT_FLAG_CHANGED,
  ACCOUNT_FLAG_CLOSED,
  ACCOUNT_FLAG_NOBUDGET,
  ACCOUNT_FLAG_NOREPORT,
  ACCOUNT_FLAG_NOSUMMAR,
  ACCOUNT_FLAG_OLDBUDGE,
  ACCOUNT_TYPE_ASSET,
  ACCOUNT_TYPE_BANK,
  ACCOUNT_TYPE_CASH,
  ACCOUNT_TYPE_CREDITCARD,
  ACCOUNT_TYPE_LIABILITY,
  ACCOUNT_TYPE_NONE,
} from "./account.ts";

// Archive constants
export {
  ARCHIVE_FLAG_ADDED,
  ARCHIVE_FLAG_AUTO,
  ARCHIVE_FLAG_CHANGED,
  ARCHIVE_FLAG_CHEQ2,
  ARCHIVE_FLAG_INCOME,
  ARCHIVE_FLAG_LIMIT,
  ARCHIVE_FLAG_OLDREMIND,
  ARCHIVE_FLAG_OLDVALID,
  ARCHIVE_FLAG_SPLIT,
  ARCHIVE_STATUS_CLEARED,
  ARCHIVE_STATUS_NONE,
  ARCHIVE_STATUS_RECONCILED,
  ARCHIVE_STATUS_REMIND,
  SCHEDULED_EVERY_UNIT_DAY,
  SCHEDULED_EVERY_UNIT_MONTH,
  SCHEDULED_EVERY_UNIT_WEEK,
  SCHEDULED_EVERY_UNIT_YEAR,
  SCHEDULED_WEEKEND_AFTER,
  SCHEDULED_WEEKEND_BEFORE,
  SCHEDULED_WEEKEND_POSSIBLE,
} from "./archive.ts";

// Assign constants
export {
  ASSIGN_FIELD_MEMO,
  ASSIGN_FIELD_PAYEE,
  ASSIGN_FLAG_DOCAT,
  ASSIGN_FLAG_DOMOD,
  ASSIGN_FLAG_DOPAY,
  ASSIGN_FLAG_EXACT,
  ASSIGN_FLAG_OVWCAT,
  ASSIGN_FLAG_OVWMOD,
  ASSIGN_FLAG_OVWPAY,
  ASSIGN_FLAG_REGEX,
} from "./assign.ts";

// Category constants
export {
  CATEGORY_FLAG_BUDGET,
  CATEGORY_FLAG_CUSTOM,
  CATEGORY_FLAG_FORCED,
  CATEGORY_FLAG_INCOME,
  CATEGORY_FLAG_SUB,
} from "./category.ts";

// Currency constants
export { CURRENCY_FLAG_CUSTOM } from "./currency.ts";

// Operation constants
export {
  OPERATION_FLAG_ADDED,
  OPERATION_FLAG_AUTO,
  OPERATION_FLAG_CHANGED,
  OPERATION_FLAG_CHEQ2,
  OPERATION_FLAG_INCOME,
  OPERATION_FLAG_LIMIT,
  OPERATION_FLAG_OLDREMIND,
  OPERATION_FLAG_OLDVALID,
  OPERATION_FLAG_SPLIT,
  PAY_MODE_CASH,
  PAY_MODE_CCARD,
  PAY_MODE_CHECK,
  PAY_MODE_DCARD,
  PAY_MODE_DEPOSIT,
  PAY_MODE_DIRECTDEBIT,
  PAY_MODE_EPAYMENT,
  PAY_MODE_FEE,
  PAY_MODE_INTXFER,
  PAY_MODE_NONE,
  PAY_MODE_NUM_MAX,
  PAY_MODE_REPEATPMT,
  PAY_MODE_XFER,
} from "./operation.ts";

// Properties constants
export {
  VEHICLE_SCHEDULED_TRANSACTION_MODE_NUMBER_OF_DAYS,
  VEHICLE_SCHEDULED_TRANSACTION_MODE_WEEKDAY,
} from "./properties.ts";
