import type { XmlElement } from "@std/xml";
import { atoi, parseGCharP, parseGDouble, parseGUInt32 } from "./_parse.ts";
import {
  type AttrSplit,
  hb_xml_attr_amt,
  hb_xml_attr_int,
  hb_xml_attr_txt,
  hb_xml_attrs_splits,
  hb_xml_tag,
  tags_toStr,
} from "./_serialize.ts";
import type { gCharP, gDouble, gUInt32, gUShort } from "./_g_types.ts";

/** A financial transaction (operation) from the `<ope>` element. */
export interface Operation {
  /** Transaction date as a Julian day number. */
  date: gUInt32;
  /** Transaction amount. */
  amount: gDouble;
  /** Key of the source account. */
  account: gUInt32;
  /** Key of the destination account (for transfers). */
  destinationAccount: gUInt32;
  /** Payment mode (`PAY_MODE_*` constant). */
  payMode: gUShort;
  /** Transaction status (none, cleared, reconciled, remind). */
  status: gUShort;
  /** Bitmask of `OPERATION_FLAG_*` values. */
  flags: gUShort;
  /** Key of the payee. */
  payee: gUInt32;
  /** Key of the category. */
  category: gUInt32;
  /** Transaction memo / description. */
  memo: gCharP;
  /** Additional info (e.g. cheque number). */
  info: gCharP;
  /** List of tag names attached to this transaction. */
  tags: gCharP[];
  /** Internal transfer key linking paired transfer transactions. */
  kxfer: gUInt32;
  /** Split transaction entries (when {@linkcode OPERATION_FLAG_SPLIT} is set). */
  splits: OperationSplit[];
}

/** No payment mode. */
export const PAY_MODE_NONE = 0;
/** Credit card. */
export const PAY_MODE_CCARD = 1;
/** Check / cheque. */
export const PAY_MODE_CHECK = 2;
/** Cash. */
export const PAY_MODE_CASH = 3;
/** Bank transfer. */
export const PAY_MODE_XFER = 4;
/** Internal transfer between accounts. */
export const PAY_MODE_INTXFER = 5;
/** Debit card. */
export const PAY_MODE_DCARD = 6;
/** Repeating / standing order payment. */
export const PAY_MODE_REPEATPMT = 7;
/** Electronic payment. */
export const PAY_MODE_EPAYMENT = 8;
/** Deposit. */
export const PAY_MODE_DEPOSIT = 9;
/** Fee / charge. */
export const PAY_MODE_FEE = 10;
/** Direct debit. */
export const PAY_MODE_DIRECTDEBIT = 11;
/** Total number of payment modes (upper bound sentinel). */
export const PAY_MODE_NUM_MAX = 12;

/** A single entry within a split transaction. */
export interface OperationSplit {
  /** Key of the split's category. */
  category: gUInt32;
  /** Split memo text. */
  memo: gCharP;
  /** Split amount. */
  amount: gDouble;
}

/** @deprecated Legacy valid flag (pre-5.x). */
export const OPERATION_FLAG_OLDVALID = 1 << 0;
/** Transaction is income. */
export const OPERATION_FLAG_INCOME = 1 << 1;
/** Transaction was auto-generated from a schedule. */
export const OPERATION_FLAG_AUTO = 1 << 2;
/** Transaction was recently added (temporary flag). */
export const OPERATION_FLAG_ADDED = 1 << 3;
/** Transaction was recently changed (temporary flag). */
export const OPERATION_FLAG_CHANGED = 1 << 4;
/** @deprecated Legacy remind flag (pre-5.x). */
export const OPERATION_FLAG_OLDREMIND = 1 << 5;
/** Use second cheque book numbering. */
export const OPERATION_FLAG_CHEQ2 = 1 << 6;
/** Scheduled transaction has a repeat limit. */
export const OPERATION_FLAG_LIMIT = 1 << 7;
/** Transaction contains split entries. */
export const OPERATION_FLAG_SPLIT = 1 << 8;

/**
 * Parses an `<ope>` XML node into an {@linkcode Operation} object.
 *
 * @param node - The `<ope>` XML node.
 * @returns The parsed operation.
 */
export function parseOperation({ attributes }: XmlElement): Operation {
  const tags: gCharP[] = attributes.tags
    ? parseGCharP(attributes.tags).split(" ")
    : [];
  const splits: OperationSplit[] = [];

  const hasSplits = attributes.scat || attributes.samt || attributes.smem;
  if (hasSplits) {
    const cats = parseGCharP(attributes.scat).split("||"),
      amts = parseGCharP(attributes.samt).split("||"),
      mems = parseGCharP(attributes.smem).split("||");

    for (let i = 0, ln = cats.length; i < ln; i++) {
      splits.push({
        category: parseGUInt32(cats[i]),
        amount: parseGDouble(amts[i]),
        memo: parseGCharP(mems[i]),
      });
    }
  }

  const operation: Operation = {
    date: atoi(attributes.date),
    amount: parseGDouble(attributes.amount),
    account: atoi(attributes.account),
    destinationAccount: atoi(attributes.dst_account),
    payMode: atoi(attributes.paymode),
    status: atoi(attributes.st),
    flags: atoi(attributes.flags),
    payee: atoi(attributes.payee),
    category: atoi(attributes.category),
    memo: parseGCharP(attributes.wording),
    info: parseGCharP(attributes.info),
    tags,
    kxfer: atoi(attributes.kxfer),
    splits,
  };

  if (hasSplits) {
    operation.flags |= OPERATION_FLAG_SPLIT;
  }

  return operation;
}

const operationSplitsToSplits = (aSplits: OperationSplit[]): AttrSplit[] =>
  aSplits.map<AttrSplit>((aSplit) => ({
    cat: aSplit.category,
    amt: aSplit.amount,
    mem: aSplit.memo,
  }));

/**
 * Serializes an {@linkcode Operation} object into an `<ope ... />` XML tag.
 *
 * @param operation - The operation to serialize.
 * @returns The self-closing XML tag string.
 */
export const serializeOperation = (operation: Operation): string => {
  const tags = tags_toStr(operation.tags);
  const splits = operationSplitsToSplits(operation.splits);
  return hb_xml_tag(
    "<ope",
    hb_xml_attr_int("date", operation.date),
    hb_xml_attr_amt("amount", operation.amount),
    hb_xml_attr_int("account", operation.account),
    hb_xml_attr_int("dst_account", operation.destinationAccount),
    hb_xml_attr_int("paymode", operation.payMode),
    hb_xml_attr_int("st", operation.status),
    hb_xml_attr_int("flags", operation.flags),
    hb_xml_attr_int("payee", operation.payee),
    hb_xml_attr_int("category", operation.category),
    hb_xml_attr_txt("wording", operation.memo),
    hb_xml_attr_txt("info", operation.info),
    tags && hb_xml_attr_txt("tags", tags),
    hb_xml_attr_int("kxfer", operation.kxfer),
    splits && hb_xml_attrs_splits(splits),
  );
};
