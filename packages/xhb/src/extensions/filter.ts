/**
 * Filter group extension for HomeBank XHB filter entities.
 *
 * Filters use grouped fields stored in XML attributes (`dat`, `acc`, `pay`,
 * `cat`, `tag`, `txt`, `amt`, `mod`, `sta`, `typ`). Each attribute encodes
 * an option value and group-specific data separated by `|`.
 *
 * The format for each attribute is `option|data` where `data` varies by
 * group type:
 *
 * - **date** (`dat`): `option|range[,mindate,maxdate]` (custom range has 3 values)
 * - **account** (`acc`): `option|key1,key2,...`
 * - **payee** (`pay`): `option|key1,key2,...`
 * - **category** (`cat`): `option|key1,key2,...`
 * - **tag** (`tag`): `option|key1,key2,...`
 * - **text** (`txt`): `option|exact{DELIM}memo{DELIM}number` (delimited by `\u00a4`)
 * - **amount** (`amt`): `option|minamount,maxamount`
 * - **paymode** (`mod`): `option|mode1,mode2,...`
 * - **status** (`sta`): `option|non,clr,rec`
 * - **type** (`typ`): `option|nexp,ninc,xexp,xinc`
 *
 * In the HomeBank C source, these are handled by `filter_group_import` and
 * `filter_group_export` in `hb-xml.c`.
 *
 * @module
 */

import type { EntityExtension } from "./types.ts";

/** Value of FLT_RANGE_MISC_CUSTOM from hb-filter.h. */
const FLT_RANGE_MISC_CUSTOM = 1;

/** Delimiter used for the text filter group (Unicode currency sign). */
const TEXT_DELIMITER = "\u00a4";

/** Date filter group data. */
export interface FilterDateGroup {
  /** Filter option (0=off, 1=include, 2=exclude). */
  option: number;
  /** Date range preset identifier. */
  range: number;
  /** Minimum date (Julian day) for custom range. */
  mindate: number;
  /** Maximum date (Julian day) for custom range. */
  maxdate: number;
}

/** Key-list filter group data (accounts, payees, categories, tags). */
export interface FilterKeyGroup {
  /** Filter option (0=off, 1=include, 2=exclude). */
  option: number;
  /** Array of selected entity keys. */
  keys: number[];
}

/** Status filter group data. */
export interface FilterStatusGroup {
  /** Filter option (0=off, 1=include, 2=exclude). */
  option: number;
  /** Include none/uncleared status. */
  non: number;
  /** Include cleared status. */
  clr: number;
  /** Include reconciled status. */
  rec: number;
}

/** Type filter group data. */
export interface FilterTypeGroup {
  /** Filter option (0=off, 1=include, 2=exclude). */
  option: number;
  /** Normal expense flag. */
  nexp: number;
  /** Normal income flag. */
  ninc: number;
  /** Transfer expense flag. */
  xexp: number;
  /** Transfer income flag. */
  xinc: number;
}

/** Paymode filter group data. */
export interface FilterPaymodeGroup {
  /** Filter option (0=off, 1=include, 2=exclude). */
  option: number;
  /** Array of selected paymode identifiers. */
  modes: number[];
}

/** Amount filter group data. */
export interface FilterAmountGroup {
  /** Filter option (0=off, 1=include, 2=exclude). */
  option: number;
  /** Minimum amount. */
  minamount: number;
  /** Maximum amount. */
  maxamount: number;
}

/** Text filter group data. */
export interface FilterTextGroup {
  /** Filter option (0=off, 1=include, 2=exclude). */
  option: number;
  /** Whether to match exactly. */
  exact: number;
  /** Memo text filter. */
  memo: string;
  /** Number/info text filter. */
  number: string;
}

/** All filter groups collected into a single structure. */
export interface FilterGroups {
  /** Date filter group. */
  dat?: FilterDateGroup;
  /** Account filter group. */
  acc?: FilterKeyGroup;
  /** Payee filter group. */
  pay?: FilterKeyGroup;
  /** Category filter group. */
  cat?: FilterKeyGroup;
  /** Tag filter group. */
  tag?: FilterKeyGroup;
  /** Text filter group. */
  txt?: FilterTextGroup;
  /** Amount filter group. */
  amt?: FilterAmountGroup;
  /** Paymode filter group. */
  mod?: FilterPaymodeGroup;
  /** Status filter group. */
  sta?: FilterStatusGroup;
  /** Type filter group. */
  typ?: FilterTypeGroup;
}

/**
 * Parses a date filter group value.
 *
 * Format: `option|range[,mindate,maxdate]`
 *
 * @param value Raw attribute value
 * @returns Parsed date filter group
 */
function parseDateGroup(value: string): FilterDateGroup {
  const parts = value.split("|", 2);
  const option = parseInt(parts[0], 10) || 0;
  const dataParts = (parts[1] ?? "").split(",");
  const range = parseInt(dataParts[0], 10) || 0;

  let mindate = 0;
  let maxdate = 0;
  if (dataParts.length >= 3 && range === FLT_RANGE_MISC_CUSTOM) {
    mindate = parseInt(dataParts[1], 10) || 0;
    maxdate = parseInt(dataParts[2], 10) || 0;
  }

  return { option, range, mindate, maxdate };
}

/**
 * Parses a key-list filter group value (accounts, payees, categories, tags).
 *
 * Format: `option|key1,key2,...`
 *
 * @param value Raw attribute value
 * @returns Parsed key-list filter group
 */
function parseKeyGroup(value: string): FilterKeyGroup {
  const parts = value.split("|", 2);
  const option = parseInt(parts[0], 10) || 0;
  const keysStr = parts[1] ?? "";

  const keys = keysStr.length > 0
    ? keysStr.split(",").map((k) => parseInt(k, 10) || 0)
    : [];

  return { option, keys };
}

/**
 * Parses a status filter group value.
 *
 * Format: `option|non,clr,rec`
 *
 * @param value Raw attribute value
 * @returns Parsed status filter group
 */
function parseStatusGroup(value: string): FilterStatusGroup {
  const parts = value.split("|", 2);
  const option = parseInt(parts[0], 10) || 0;
  const dataParts = (parts[1] ?? "").split(",");

  return {
    option,
    non: parseInt(dataParts[0], 10) || 0,
    clr: parseInt(dataParts[1], 10) || 0,
    rec: parseInt(dataParts[2], 10) || 0,
  };
}

/**
 * Parses a type filter group value.
 *
 * Format: `option|nexp,ninc,xexp,xinc`
 *
 * @param value Raw attribute value
 * @returns Parsed type filter group
 */
function parseTypeGroup(value: string): FilterTypeGroup {
  const parts = value.split("|", 2);
  const option = parseInt(parts[0], 10) || 0;
  const dataParts = (parts[1] ?? "").split(",");

  return {
    option,
    nexp: parseInt(dataParts[0], 10) || 0,
    ninc: parseInt(dataParts[1], 10) || 0,
    xexp: parseInt(dataParts[2], 10) || 0,
    xinc: parseInt(dataParts[3], 10) || 0,
  };
}

/**
 * Parses a paymode filter group value.
 *
 * Format: `option|mode1,mode2,...`
 *
 * @param value Raw attribute value
 * @returns Parsed paymode filter group
 */
function parsePaymodeGroup(value: string): FilterPaymodeGroup {
  const parts = value.split("|", 2);
  const option = parseInt(parts[0], 10) || 0;
  const modesStr = parts[1] ?? "";

  const modes = modesStr.length > 0
    ? modesStr.split(",").map((m) => parseInt(m, 10) || 0)
    : [];

  return { option, modes };
}

/**
 * Parses an amount filter group value.
 *
 * Format: `option|minamount,maxamount`
 *
 * @param value Raw attribute value
 * @returns Parsed amount filter group
 */
function parseAmountGroup(value: string): FilterAmountGroup {
  const parts = value.split("|", 2);
  const option = parseInt(parts[0], 10) || 0;
  const dataParts = (parts[1] ?? "").split(",");

  return {
    option,
    minamount: parseFloat(dataParts[0]) || 0,
    maxamount: parseFloat(dataParts[1]) || 0,
  };
}

/**
 * Parses a text filter group value.
 *
 * Format: `option|exact{DELIM}memo{DELIM}number` where `{DELIM}` is
 * the Unicode currency sign (`\u00a4`).
 *
 * @param value Raw attribute value
 * @returns Parsed text filter group
 */
function parseTextGroup(value: string): FilterTextGroup {
  const parts = value.split("|", 2);
  const option = parseInt(parts[0], 10) || 0;
  const dataParts = (parts[1] ?? "").split(TEXT_DELIMITER);

  return {
    option,
    exact: parseInt(dataParts[0], 10) || 0,
    memo: dataParts[1] ?? "",
    number: dataParts[2] ?? "",
  };
}

/**
 * Serializes a date filter group to an attribute value string.
 *
 * @param group Date filter group data
 * @returns Formatted attribute value
 */
function serializeDateGroup(group: FilterDateGroup): string {
  if (group.range === FLT_RANGE_MISC_CUSTOM) {
    return `${group.option}|${FLT_RANGE_MISC_CUSTOM},${group.mindate},${group.maxdate}`;
  }
  return `${group.option}|${group.range}`;
}

/**
 * Serializes a key-list filter group to an attribute value string.
 *
 * @param group Key-list filter group data
 * @returns Formatted attribute value
 */
function serializeKeyGroup(group: FilterKeyGroup): string {
  return `${group.option}|${group.keys.join(",")}`;
}

/**
 * Serializes a status filter group to an attribute value string.
 *
 * @param group Status filter group data
 * @returns Formatted attribute value
 */
function serializeStatusGroup(group: FilterStatusGroup): string {
  return `${group.option}|${group.non},${group.clr},${group.rec}`;
}

/**
 * Serializes a type filter group to an attribute value string.
 *
 * @param group Type filter group data
 * @returns Formatted attribute value
 */
function serializeTypeGroup(group: FilterTypeGroup): string {
  return `${group.option}|${group.nexp},${group.ninc},${group.xexp},${group.xinc}`;
}

/**
 * Serializes a paymode filter group to an attribute value string.
 *
 * @param group Paymode filter group data
 * @returns Formatted attribute value
 */
function serializePaymodeGroup(group: FilterPaymodeGroup): string {
  return `${group.option}|${group.modes.join(",")}`;
}

/**
 * Serializes an amount filter group to an attribute value string.
 *
 * @param group Amount filter group data
 * @returns Formatted attribute value
 */
function serializeAmountGroup(group: FilterAmountGroup): string {
  return `${group.option}|${group.minamount},${group.maxamount}`;
}

/**
 * Serializes a text filter group to an attribute value string.
 *
 * @param group Text filter group data
 * @returns Formatted attribute value
 */
function serializeTextGroup(group: FilterTextGroup): string {
  return `${group.option}|${group.exact}${TEXT_DELIMITER}${group.memo}${TEXT_DELIMITER}${group.number}`;
}

/**
 * Parses all filter group attributes from raw XML attributes into
 * a structured {@link FilterGroups} object.
 *
 * Only groups present in the attributes are included in the result.
 * The attribute names map to groups as follows:
 * `dat`=date, `acc`=account, `pay`=payee, `cat`=category, `tag`=tag,
 * `txt`=text, `amt`=amount, `mod`=paymode, `sta`=status, `typ`=type.
 *
 * @param attrs Raw XML attribute key-value pairs
 * @returns Parsed filter groups
 *
 * @example Parse filter group attributes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseFilterGroups } from "@hertzg/xhb/extensions/filter";
 *
 * const groups = parseFilterGroups({
 *   dat: "1|2",
 *   sta: "1|1,0,1",
 *   typ: "2|1,0,1,0",
 * });
 *
 * assertEquals(groups.dat, { option: 1, range: 2, mindate: 0, maxdate: 0 });
 * assertEquals(groups.sta, { option: 1, non: 1, clr: 0, rec: 1 });
 * assertEquals(groups.typ, { option: 2, nexp: 1, ninc: 0, xexp: 1, xinc: 0 });
 * ```
 */
export function parseFilterGroups(
  attrs: Record<string, string>,
): FilterGroups {
  const groups: FilterGroups = {};

  if ("dat" in attrs) groups.dat = parseDateGroup(attrs["dat"]);
  if ("acc" in attrs) groups.acc = parseKeyGroup(attrs["acc"]);
  if ("pay" in attrs) groups.pay = parseKeyGroup(attrs["pay"]);
  if ("cat" in attrs) groups.cat = parseKeyGroup(attrs["cat"]);
  if ("tag" in attrs) groups.tag = parseKeyGroup(attrs["tag"]);
  if ("txt" in attrs) groups.txt = parseTextGroup(attrs["txt"]);
  if ("amt" in attrs) groups.amt = parseAmountGroup(attrs["amt"]);
  if ("mod" in attrs) groups.mod = parsePaymodeGroup(attrs["mod"]);
  if ("sta" in attrs) groups.sta = parseStatusGroup(attrs["sta"]);
  if ("typ" in attrs) groups.typ = parseTypeGroup(attrs["typ"]);

  return groups;
}

/**
 * Serializes a {@link FilterGroups} object into XML attribute strings.
 *
 * Only groups with a non-zero option value are emitted, matching the
 * HomeBank C behavior where `filter_group_export` returns `NULL` when
 * `option[group]` is 0.
 *
 * @param groups Filter groups to serialize
 * @returns Array of XML attribute strings
 *
 * @example Serialize filter groups to attribute strings
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { serializeFilterGroups } from "@hertzg/xhb/extensions/filter";
 *
 * const attrs = serializeFilterGroups({
 *   dat: { option: 1, range: 2, mindate: 0, maxdate: 0 },
 *   sta: { option: 1, non: 1, clr: 0, rec: 1 },
 * });
 *
 * assertEquals(attrs, [
 *   'dat="1|2"',
 *   'sta="1|1,0,1"',
 * ]);
 * ```
 */
export function serializeFilterGroups(groups: FilterGroups): string[] {
  const attrs: string[] = [];

  if (groups.dat && groups.dat.option > 0) {
    attrs.push(`dat="${serializeDateGroup(groups.dat)}"`);
  }
  if (groups.acc && groups.acc.option > 0) {
    attrs.push(`acc="${serializeKeyGroup(groups.acc)}"`);
  }
  if (groups.pay && groups.pay.option > 0) {
    attrs.push(`pay="${serializeKeyGroup(groups.pay)}"`);
  }
  if (groups.cat && groups.cat.option > 0) {
    attrs.push(`cat="${serializeKeyGroup(groups.cat)}"`);
  }
  if (groups.tag && groups.tag.option > 0) {
    attrs.push(`tag="${serializeKeyGroup(groups.tag)}"`);
  }
  if (groups.txt && groups.txt.option > 0) {
    attrs.push(`txt="${serializeTextGroup(groups.txt)}"`);
  }
  if (groups.amt && groups.amt.option > 0) {
    attrs.push(`amt="${serializeAmountGroup(groups.amt)}"`);
  }
  if (groups.mod && groups.mod.option > 0) {
    attrs.push(`mod="${serializePaymodeGroup(groups.mod)}"`);
  }
  if (groups.sta && groups.sta.option > 0) {
    attrs.push(`sta="${serializeStatusGroup(groups.sta)}"`);
  }
  if (groups.typ && groups.typ.option > 0) {
    attrs.push(`typ="${serializeTypeGroup(groups.typ)}"`);
  }

  return attrs;
}

/**
 * Creates a filter extension that parses filter group attributes
 * (`dat`, `acc`, `pay`, `cat`, `tag`, `txt`, `amt`, `mod`, `sta`, `typ`)
 * into a `filterGroups` field on the entity and serializes them back.
 *
 * @returns An {@link EntityExtension} for filter group handling
 *
 * @example Create and use a filter extension
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { filterExtension } from "@hertzg/xhb/extensions/filter";
 * import type { FilterGroups } from "@hertzg/xhb/extensions/filter";
 *
 * const ext = filterExtension();
 * const entity: Record<string, unknown> = {};
 * ext.parse({ dat: "1|1,100,200", amt: "2|10.5,500" }, entity);
 *
 * const groups = entity["filterGroups"] as FilterGroups;
 * assertEquals(groups.dat, {
 *   option: 1,
 *   range: 1,
 *   mindate: 100,
 *   maxdate: 200,
 * });
 * assertEquals(groups.amt, {
 *   option: 2,
 *   minamount: 10.5,
 *   maxamount: 500,
 * });
 *
 * const attrs = ext.serialize(entity);
 * assertEquals(attrs, [
 *   'dat="1|1,100,200"',
 *   'amt="2|10.5,500"',
 * ]);
 * ```
 */
export function filterExtension(): EntityExtension {
  return {
    parse(
      attrs: Record<string, string>,
      entity: Record<string, unknown>,
    ): void {
      entity["filterGroups"] = parseFilterGroups(attrs);
    },
    serialize(entity: Record<string, unknown>): string[] {
      const groups = entity["filterGroups"];
      if (!groups || typeof groups !== "object") {
        return [];
      }
      return serializeFilterGroups(groups as FilterGroups);
    },
  };
}
