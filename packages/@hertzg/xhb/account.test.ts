import { assertEquals } from "@std/assert";
import { parse, serialize } from "./mod.ts";
import { ACCOUNT_TYPE_BANK, serializeAccount } from "./account.ts";

// HomeBank omits an attribute instead of writing an empty one, so a parsed
// entity holds `undefined` wherever the XML had nothing.
const OMITTED = undefined as unknown as string;

Deno.test("parseAccount renames the terse XHB attributes to descriptive properties", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<account key="1" pos="1" type="1" curr="1" name="Cheque Account" number="01548726554" bankname="Amiga Universal Bank" initial="76.219999999999999" minimum="-30.489999999999998" cheque1="8760951"/>',
    "</homebank>",
    "",
  ].join("\n");

  assertEquals(parse(xml).accounts[0], {
    key: 1,
    // `flags`, `cheque2` and `tpl` were omitted from the XML, so they parse
    // to 0 and serialize back to nothing at all (ADR 0001).
    flags: 0,
    displayPosition: 1,
    type: ACCOUNT_TYPE_BANK,
    currency: 1,
    name: "Cheque Account",
    bankNumber: "01548726554",
    bankName: "Amiga Universal Bank",
    // Balances keep their C-double text; Number() would round these to
    // 76.22 and -30.49 (ADR 0002).
    startingBalance: "76.219999999999999",
    overdraftLimit: "-30.489999999999998",
    chequeBookNumber1: 8760951,
    chequeBookNumber2: 0,
    // An omitted text attribute is undefined, not "" — the difference
    // decides whether it is written back out.
    notes: OMITTED,
    defaultTemplate: 0,
  });

  assertEquals(serialize(parse(xml)), xml);
});

Deno.test("serializeAccount omits every zero-valued integer attribute", () => {
  assertEquals(
    serializeAccount({
      key: 4,
      flags: 0,
      displayPosition: 4,
      type: 0,
      currency: 4,
      name: "Bitcoin Account",
      bankNumber: OMITTED,
      bankName: OMITTED,
      startingBalance: "0.41999999999999998",
      overdraftLimit: "0",
      chequeBookNumber1: 0,
      chequeBookNumber2: 0,
      notes: OMITTED,
      defaultTemplate: 0,
    }),
    // No flags, no type, no cheque numbers, no tpl — but `minimum="0"`
    // stays, because amounts are text and only integers are dropped at 0.
    '<account key="4" pos="4" curr="4" name="Bitcoin Account" initial="0.41999999999999998" minimum="0"/>',
  );
});

Deno.test("notes are the only account text that gets XML-escaped", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<account key="1" name="R&amp;D" notes="paid &amp; done&#xa;line two"/>',
    "</homebank>",
    "",
  ].join("\n");

  const account = parse(xml).accounts[0];
  assertEquals(account.name, "R&D");
  assertEquals(account.notes, "paid & done\nline two");

  // HomeBank writes `notes` through its escaping helper and every other
  // text attribute raw, so the ampersand in `name` comes back unescaped
  // while the one in `notes` does not. Faithful to the C original
  // (ADR 0001/0003) even though it makes the output non-well-formed XML.
  assertEquals(
    serialize(parse(xml)).split("\n")[2],
    '<account key="1" name="R&D" notes="paid &amp; done&#xa;line two"/>',
  );
});
