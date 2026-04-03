import type { Node } from "xml-parser";
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

export interface Operation {
  date: gUInt32;
  amount: gDouble;
  account: gUInt32;
  destinationAccount: gUInt32;
  payMode: gUShort;
  status: gUShort;
  flags: gUShort;
  payee: gUInt32;
  category: gUInt32;
  memo: gCharP;
  info: gCharP;
  tags: gCharP[];
  kxfer: gUInt32;
  splits: OperationSplit[];
}

export const PAY_MODE_NONE = 0;
export const PAY_MODE_CCARD = 1;
export const PAY_MODE_CHECK = 2;
export const PAY_MODE_CASH = 3;
export const PAY_MODE_XFER = 4;
export const PAY_MODE_INTXFER = 5;
export const PAY_MODE_DCARD = 6;
export const PAY_MODE_REPEATPMT = 7;
export const PAY_MODE_EPAYMENT = 8;
export const PAY_MODE_DEPOSIT = 9;
export const PAY_MODE_FEE = 10;
export const PAY_MODE_DIRECTDEBIT = 11;
export const PAY_MODE_NUM_MAX = 12;

export interface OperationSplit {
  category: gUInt32;
  memo: gCharP;
  amount: gDouble;
}

export const OPERATION_FLAG_OLDVALID = 1 << 0;
export const OPERATION_FLAG_INCOME = 1 << 1;
export const OPERATION_FLAG_AUTO = 1 << 2;
export const OPERATION_FLAG_ADDED = 1 << 3;
export const OPERATION_FLAG_CHANGED = 1 << 4;
export const OPERATION_FLAG_OLDREMIND = 1 << 5;
export const OPERATION_FLAG_CHEQ2 = 1 << 6;
export const OPERATION_FLAG_LIMIT = 1 << 7;
export const OPERATION_FLAG_SPLIT = 1 << 8;

export function parseOperation({ attributes }: Node): Operation {
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
