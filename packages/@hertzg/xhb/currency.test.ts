import { assertEquals } from "@std/assert";
import { parse, serialize } from "./mod.ts";
import { CURRENCY_FLAG_CUSTOM, serializeCurrency } from "./currency.ts";

Deno.test("parseCurrency reads the formatting rules HomeBank uses to print amounts", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<cur key="3" flags="0" iso="EUR" name="Euro" symb="€" syprf="1" dchar="," gchar=" " frac="2" rate="1.1342000000000001" mdate="0"/>',
    "</homebank>",
    "",
  ].join("\n");

  assertEquals(parse(xml).currencies[0], {
    key: 3,
    flags: 0,
    name: "Euro",
    isoCode: "EUR",
    symbol: "€",
    // "€1.00" rather than "1.00 €".
    symbolIsPrefixed: 1,
    // European convention: 1 234,56.
    decimalCharacter: ",",
    groupingCharacter: " ",
    fractionDigits: 2,
    exchangeRate: "1.1342000000000001",
    lastUpdatedDate: 0,
  });

  assertEquals(serialize(parse(xml)), xml);
});

Deno.test("<cur> always writes its full attribute list, zeros and empties included", () => {
  // Unlike the other entities, currency does not go through hb_xml_tag and
  // so has no attribute-omission rules at all: a custom currency with no ISO
  // code and no grouping character still writes iso="" and gchar=""
  // (this is the Bitcoin entry from the 5.4.2 fixture).
  assertEquals(
    serializeCurrency({
      key: 4,
      flags: CURRENCY_FLAG_CUSTOM,
      name: "Bitcoin",
      isoCode: "",
      symbol: "₿",
      symbolIsPrefixed: 0,
      decimalCharacter: ".",
      groupingCharacter: "",
      fractionDigits: 2,
      exchangeRate: "0.00020000000000000001",
      lastUpdatedDate: 0,
    }),
    '<cur key="4" flags="2" iso="" name="Bitcoin" symb="₿" syprf="0" dchar="." gchar="" frac="2" rate="0.00020000000000000001" mdate="0"/>',
  );
});
