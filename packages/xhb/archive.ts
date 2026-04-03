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

/** A scheduled / recurring transaction template from the `<fav>` element. */
export interface Archive {
  /** Unique archive key. */
  key: gUInt32;
  /** Transaction amount. */
  amount: gDouble;
  /** Key of the source account. */
  account: gUInt32;
  /** Key of the destination account (for transfers). */
  destinationAccount: gUInt32;
  /** Payment mode (`PAY_MODE_*` constant). */
  payMode: gUShort;
  /** Transaction status (`ARCHIVE_STATUS_*` constant). */
  status: gUShort;
  /** Bitmask of `ARCHIVE_FLAG_*` values. */
  flags: gUShort;
  /** Key of the payee. */
  payee: gUInt32;
  /** Key of the category. */
  category: gUInt32;
  /** Transaction memo / description. */
  memo: gCharP;
  /** List of tag names. */
  tags: gCharP[];
  /** Next scheduled execution date (Julian day). */
  scheduledNextDate: gUInt32;
  /** Repeat every N units. */
  scheduledEveryNumber: gUShort;
  /** Repeat unit (`SCHEDULED_EVERY_UNIT_*` constant). */
  scheduledEveryUnit: gUShort;
  /** Stop after this many occurrences (`0` = unlimited). */
  scheduledStopAfter: gUShort;
  /** Weekend handling policy (`SCHEDULED_WEEKEND_*` constant). */
  scheduledWeekend: gUShort;
  /** Gap in days before the next date to auto-insert. */
  scheduledGap: gUShort;
  /** Split transaction entries (when {@linkcode ARCHIVE_FLAG_SPLIT} is set). */
  splits: ArchiveSplit[];
}

/** A single entry within a split scheduled transaction. */
export interface ArchiveSplit {
  /** Key of the split's category. */
  category: gUInt32;
  /** Split memo text. */
  memo: gCharP;
  /** Split amount. */
  amount: gDouble;
}

/** @deprecated Legacy valid flag (pre-5.x). */
export const ARCHIVE_FLAG_OLDVALID = 1 << 0;
/** Transaction is income. */
export const ARCHIVE_FLAG_INCOME = 1 << 1;
/** Archive is a scheduled (auto) transaction. */
export const ARCHIVE_FLAG_AUTO = 1 << 2;
/** Archive was recently added (temporary flag). */
export const ARCHIVE_FLAG_ADDED = 1 << 3;
/** Archive was recently changed (temporary flag). */
export const ARCHIVE_FLAG_CHANGED = 1 << 4;
/** @deprecated Legacy remind flag (pre-5.x). */
export const ARCHIVE_FLAG_OLDREMIND = 1 << 5;
/** Use second cheque book numbering. */
export const ARCHIVE_FLAG_CHEQ2 = 1 << 6;
/** Scheduled transaction has a repeat limit. */
export const ARCHIVE_FLAG_LIMIT = 1 << 7;
/** Transaction contains split entries. */
export const ARCHIVE_FLAG_SPLIT = 1 << 8;

/** No status. */
export const ARCHIVE_STATUS_NONE = 0;
/** Cleared. */
export const ARCHIVE_STATUS_CLEARED = 1;
/** Reconciled. */
export const ARCHIVE_STATUS_RECONCILED = 2;
/** Reminder. */
export const ARCHIVE_STATUS_REMIND = 3;

/** Repeat every N days. */
export const SCHEDULED_EVERY_UNIT_DAY = 0;
/** Repeat every N weeks. */
export const SCHEDULED_EVERY_UNIT_WEEK = 1;
/** Repeat every N months. */
export const SCHEDULED_EVERY_UNIT_MONTH = 2;
/** Repeat every N years. */
export const SCHEDULED_EVERY_UNIT_YEAR = 3;

/** Allow scheduling on weekends. */
export const SCHEDULED_WEEKEND_POSSIBLE = 0;
/** Move to the Friday before if landing on a weekend. */
export const SCHEDULED_WEEKEND_BEFORE = 1;
/** Move to the Monday after if landing on a weekend. */
export const SCHEDULED_WEEKEND_AFTER = 2;

/**
 * Parses a `<fav>` XML node into an {@linkcode Archive} object.
 *
 * @param node - The `<fav>` XML node.
 * @returns The parsed archive.
 */
export function parseArchive({ attributes }: XmlElement): Archive {
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

/**
 * Serializes an {@linkcode Archive} object into a `<fav ... />` XML tag.
 *
 * @param archive - The archive to serialize.
 * @returns The self-closing XML tag string.
 */
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
