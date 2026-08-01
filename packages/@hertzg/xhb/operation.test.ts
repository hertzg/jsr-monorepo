import { assertEquals } from "@std/assert";
import { parse, serialize } from "./mod.ts";
import {
  OPERATION_FLAG_SPLIT,
  PAY_MODE_CCARD,
  serializeOperation,
} from "./operation.ts";

// HomeBank omits an attribute instead of writing an empty one, so a parsed
// entity holds `undefined` wherever the XML had nothing.
const OMITTED = undefined as unknown as string;

Deno.test("an <ope> is one transaction: a date, an amount and a pile of foreign keys", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<ope date="736968" amount="-42.5" account="1" paymode="1" payee="1" category="1" wording="Weekly shop" info="ref-1" kxfer="3"/>',
    "</homebank>",
    "",
  ].join("\n");

  assertEquals(parse(xml).operations[0], {
    // Dates are Julian day numbers, not timestamps.
    date: 736968,
    amount: "-42.5",
    account: 1,
    // `dst_account`, `st` and `flags` were omitted, so they are 0.
    destinationAccount: 0,
    payMode: PAY_MODE_CCARD,
    status: 0,
    flags: 0,
    payee: 1,
    category: 1,
    // `wording` in the XML, `memo` on the object.
    memo: "Weekly shop",
    info: "ref-1",
    tags: [],
    // Both halves of an internal transfer carry the same kxfer.
    kxfer: 3,
    splits: [],
  });

  assertEquals(serialize(parse(xml)), xml);
});

Deno.test("tags are a space-separated list of tag names, not keys", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<tag key="1" name="groceries"/>',
    '<tag key="2" name="weekly"/>',
    '<ope date="736968" amount="-42.5" account="1" tags="groceries weekly"/>',
    "</homebank>",
    "",
  ].join("\n");

  assertEquals(parse(xml).operations[0].tags, ["groceries", "weekly"]);

  // Which is why a tag name can never contain a space.
  assertEquals(serialize(parse(xml)), xml);
});

Deno.test("a split transaction stores its parts in three parallel ||-separated lists", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<ope date="736968" amount="-20" account="1" flags="256" scat="12||13" samt="-15.5||-4.5" smem="bread||"/>',
    "</homebank>",
    "",
  ].join("\n");

  const [operation] = parse(xml).operations;

  // scat/samt/smem are zipped positionally; the second split simply has an
  // empty memo, which still occupies its slot in `smem`.
  assertEquals(operation.splits, [
    { category: 12, amount: "-15.5", memo: "bread" },
    { category: 13, amount: "-4.5", memo: "" },
  ]);

  // The whole-transaction amount stays alongside the split amounts.
  assertEquals(operation.amount, "-20");

  assertEquals(serialize(parse(xml)), xml);
});

Deno.test("parsing splits sets OPERATION_FLAG_SPLIT even when the flags attribute did not", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<ope date="736968" amount="-20" account="1" scat="12||13" samt="-15.5||-4.5" smem="||"/>',
    "</homebank>",
    "",
  ].join("\n");

  const [operation] = parse(xml).operations;

  assertEquals(operation.flags, OPERATION_FLAG_SPLIT);
  assertEquals(operation.splits.length, 2);

  // The flag is therefore added to the output that was missing from the
  // input — the one case where parse/serialize is allowed to be additive.
  assertEquals(
    serialize(parse(xml)).split("\n")[2],
    '<ope date="736968" amount="-20" account="1" flags="256" scat="12||13" samt="-15.5||-4.5" smem="||"/>',
  );
});

Deno.test("serializeOperation writes the amount even at zero but drops zeroed keys", () => {
  assertEquals(
    serializeOperation({
      date: 736968,
      amount: "0",
      account: 1,
      destinationAccount: 0,
      payMode: 0,
      status: 0,
      flags: 0,
      payee: 0,
      category: 0,
      memo: OMITTED,
      info: OMITTED,
      tags: [],
      kxfer: 0,
      splits: [],
    }),
    '<ope date="736968" amount="0" account="1"/>',
  );
});
