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

export interface Archive {
  key: gUInt32;
  amount: gDouble;
  account: gUInt32;
  destinationAccount: gUInt32;
  payMode: gUShort;
  status: gUShort;
  flags: gUShort;
  payee: gUInt32;
  category: gUInt32;
  memo: gCharP;
  tags: gCharP[];
  scheduledNextDate: gUInt32;
  scheduledEveryNumber: gUShort;
  scheduledEveryUnit: gUShort;
  scheduledStopAfter: gUShort;
  scheduledWeekend: gUShort;
  scheduledGap: gUShort;
  splits: ArchiveSplit[];
}

export interface ArchiveSplit {
  category: gUInt32;
  memo: gCharP;
  amount: gDouble;
}

export const ARCHIVE_FLAG_OLDVALID = 1 << 0;
export const ARCHIVE_FLAG_INCOME = 1 << 1;
export const ARCHIVE_FLAG_AUTO = 1 << 2;
export const ARCHIVE_FLAG_ADDED = 1 << 3;
export const ARCHIVE_FLAG_CHANGED = 1 << 4;
export const ARCHIVE_FLAG_OLDREMIND = 1 << 5;
export const ARCHIVE_FLAG_CHEQ2 = 1 << 6;
export const ARCHIVE_FLAG_LIMIT = 1 << 7;
export const ARCHIVE_FLAG_SPLIT = 1 << 8;

export const ARCHIVE_STATUS_NONE = 0;
export const ARCHIVE_STATUS_CLEARED = 1;
export const ARCHIVE_STATUS_RECONCILED = 2;
export const ARCHIVE_STATUS_REMIND = 3;

export const SCHEDULED_EVERY_UNIT_DAY = 0;
export const SCHEDULED_EVERY_UNIT_WEEK = 1;
export const SCHEDULED_EVERY_UNIT_MONTH = 2;
export const SCHEDULED_EVERY_UNIT_YEAR = 3;

export const SCHEDULED_WEEKEND_POSSIBLE = 0;
export const SCHEDULED_WEEKEND_BEFORE = 1;
export const SCHEDULED_WEEKEND_AFTER = 2;

export function parseArchive({ attributes }: Node): Archive {
  const tags: gCharP[] = attributes.tags
    ? parseGCharP(attributes.tags).split(" ")
    : [];
  const splits: ArchiveSplit[] = [];

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

  const archive: Archive = {
    key: atoi(attributes.key),
    amount: parseGDouble(attributes.amount),
    account: atoi(attributes.account),
    destinationAccount: atoi(attributes.dst_account),
    payMode: atoi(attributes.paymode),
    status: atoi(attributes.st),
    flags: atoi(attributes.flags),
    payee: atoi(attributes.payee),
    category: atoi(attributes.category),
    memo: parseGCharP(attributes.wording),
    tags,
    scheduledNextDate: atoi(attributes.nextdate),
    scheduledEveryNumber: atoi(attributes.every),
    scheduledEveryUnit: atoi(attributes.unit),
    scheduledStopAfter: atoi(attributes.limit),
    scheduledWeekend: atoi(attributes.weekend),
    scheduledGap: atoi(attributes.gap),
    splits,
  };

  if (hasSplits) {
    archive.flags |= ARCHIVE_FLAG_SPLIT;
  }

  return archive;
}

const archiveSplitsToSplits = (aSplits: ArchiveSplit[]): AttrSplit[] =>
  aSplits.map<AttrSplit>((aSplit) => ({
    cat: aSplit.category,
    amt: aSplit.amount,
    mem: aSplit.memo,
  }));

export const serializeArchive = (archive: Archive): string => {
  const tags = tags_toStr(archive.tags);
  const splits = archiveSplitsToSplits(archive.splits);
  return hb_xml_tag(
    "<fav",
    hb_xml_attr_int("key", archive.key),
    hb_xml_attr_amt("amount", archive.amount),
    hb_xml_attr_int("account", archive.account),
    hb_xml_attr_int("dst_account", archive.destinationAccount),
    hb_xml_attr_int("paymode", archive.payMode),
    hb_xml_attr_int("st", archive.status),
    hb_xml_attr_int("flags", archive.flags),
    hb_xml_attr_int("payee", archive.payee),
    hb_xml_attr_int("category", archive.category),
    hb_xml_attr_txt("wording", archive.memo),
    tags && hb_xml_attr_txt("tags", tags),
    hb_xml_attr_int("nextdate", archive.scheduledNextDate),
    hb_xml_attr_int("every", archive.scheduledEveryNumber),
    hb_xml_attr_int("unit", archive.scheduledEveryUnit),
    hb_xml_attr_int("limit", archive.scheduledStopAfter),
    hb_xml_attr_int("weekend", archive.scheduledWeekend),
    hb_xml_attr_int("gap", archive.scheduledGap),
    splits && hb_xml_attrs_splits(splits),
  );
};
