import { assertEquals } from "@std/assert";
import { parse, serialize } from "./mod.ts";
import {
  ARCHIVE_FLAG_AUTO,
  ARCHIVE_FLAG_SPLIT,
  SCHEDULED_EVERY_UNIT_MONTH,
  SCHEDULED_WEEKEND_AFTER,
} from "./archive.ts";
import { PAY_MODE_XFER } from "./operation.ts";

Deno.test("a <fav> is a transaction template plus a schedule", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<fav key="9" amount="-15" account="1" paymode="4" flags="4" payee="22" category="41" wording="Recurring Donation" nextdate="731961" every="1" unit="2" limit="1" weekend="2"/>',
    "</homebank>",
    "",
  ].join("\n");

  assertEquals(parse(xml).archives[0], {
    key: 9,
    amount: "-15",
    account: 1,
    destinationAccount: 0,
    payMode: PAY_MODE_XFER,
    status: 0,
    // Set to auto-insert rather than only reminding.
    flags: ARCHIVE_FLAG_AUTO,
    payee: 22,
    category: 41,
    memo: "Recurring Donation",
    tags: [],
    // Every 1 month, moved to the Monday after if it lands on a weekend,
    // stopping after 1 more occurrence.
    scheduledNextDate: 731961,
    scheduledEveryNumber: 1,
    scheduledEveryUnit: SCHEDULED_EVERY_UNIT_MONTH,
    scheduledStopAfter: 1,
    scheduledWeekend: SCHEDULED_WEEKEND_AFTER,
    scheduledGap: 0,
    splits: [],
  });

  assertEquals(serialize(parse(xml)), xml);
});

Deno.test("archives use the same ||-framed splits as operations and set ARCHIVE_FLAG_SPLIT", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<fav key="1" amount="-30" account="1" flags="256" wording="Monthly bills" nextdate="731341" every="1" unit="2" scat="33||41" samt="-20||-10" smem="rent||"/>',
    "</homebank>",
    "",
  ].join("\n");

  const [archive] = parse(xml).archives;

  assertEquals(archive.splits, [
    { category: 33, amount: "-20", memo: "rent" },
    { category: 41, amount: "-10", memo: "" },
  ]);
  assertEquals(archive.flags, ARCHIVE_FLAG_SPLIT);

  assertEquals(serialize(parse(xml)), xml);
});
