import type { XmlElement } from "@std/xml";
import { atoi, parseGCharP, parseGDouble } from "./_parse.ts";
import { dtostr } from "./_serialize.ts";
import type {
  gBoolean,
  gCharP,
  gDouble,
  gShort,
  gUInt32,
  gUShort,
} from "./_g_types.ts";

/** A currency definition from the `<cur>` element. */
export interface Currency {
  /** Unique currency key. */
  key: gUInt32;
  /** Bitmask of `CURRENCY_FLAG_*` values. */
  flags: gUShort;
  /** Display name of the currency. */
  name: gCharP;
  /** ISO 4217 currency code (e.g. `"USD"`, `"EUR"`). */
  isoCode: gCharP;
  /** Currency symbol (e.g. `"$"`, `"\u20AC"`). */
  symbol: gCharP;
  /** Whether the symbol is shown before the amount (`1`) or after (`0`). */
  symbolIsPrefixed: gBoolean;
  /** Decimal separator character (e.g. `"."`). */
  decimalCharacter: gCharP;
  /** Thousands grouping character (e.g. `","`). */
  groupingCharacter: gCharP;
  /** Number of fractional digits to display. */
  fractionDigits: gShort;
  /** Exchange rate relative to the base currency. */
  exchangeRate: gDouble;
  /** Date the exchange rate was last updated (Julian day). */
  lastUpdatedDate: gUInt32;
}

/** Currency has been user-customized. */
export const CURRENCY_FLAG_CUSTOM = 1 << 1;

/**
 * Parses a `<cur>` XML node into a {@linkcode Currency} object.
 *
 * @param node - The `<cur>` XML node.
 * @returns The parsed currency.
 */
export function parseCurrency({ attributes }: XmlElement): Currency {
  return {
    key: atoi(attributes.key),
    flags: atoi(attributes.flags),
    name: parseGCharP(attributes.name),
    isoCode: parseGCharP(attributes.iso),
    symbol: parseGCharP(attributes.symb),
    symbolIsPrefixed: atoi(attributes.syprf),
    decimalCharacter: parseGCharP(attributes.dchar),
    groupingCharacter: parseGCharP(attributes.gchar),
    fractionDigits: atoi(attributes.frac),
    exchangeRate: parseGDouble(attributes.rate),
    lastUpdatedDate: atoi(attributes.mdate),
  };
}

/**
 * Serializes a {@linkcode Currency} object into a `<cur ... />` XML tag.
 *
 * @param currency - The currency to serialize.
 * @returns The self-closing XML tag string.
 */
export const serializeCurrency = (currency: Currency): string =>
  `<cur key="${currency.key}" flags="${currency.flags}" iso="${currency.isoCode}" name="${currency.name}" symb="${currency.symbol}" syprf="${currency.symbolIsPrefixed}" dchar="${currency.decimalCharacter}" gchar="${currency.groupingCharacter}" frac="${currency.fractionDigits}" rate="${dtostr(currency.exchangeRate)}" mdate="${currency.lastUpdatedDate}"/>`;
