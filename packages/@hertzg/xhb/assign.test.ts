import { assertEquals } from "@std/assert";
import { parse, serialize } from "./mod.ts";
import {
  ASSIGN_FIELD_PAYEE,
  ASSIGN_FLAG_DOCAT,
  ASSIGN_FLAG_DOPAY,
  ASSIGN_FLAG_EXACT,
} from "./assign.ts";
import { PAY_MODE_CASH } from "./operation.ts";

Deno.test("an <asg> rule matches imported transactions and fills in the blanks", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<asg key="1" flags="6" field="1" name="Shell" payee="7" category="2" paymode="3"/>',
    "</homebank>",
    "",
  ].join("\n");

  assertEquals(parse(xml).assigns[0], {
    key: 1,
    // Assign both a payee and a category when the rule matches.
    flags: ASSIGN_FLAG_DOPAY | ASSIGN_FLAG_DOCAT,
    field: ASSIGN_FIELD_PAYEE,
    name: "Shell",
    payee: 7,
    category: 2,
    payMode: PAY_MODE_CASH,
  });

  assertEquals(serialize(parse(xml)), xml);
});

Deno.test("format version 0.7 and older keep `exact` as its own attribute, later versions as a flag", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="0.7" d="030000">',
    '<asg key="1" name="Shell" exact="1"/>',
    '<asg key="2" name="Amazon"/>',
    "</homebank>",
    "",
  ].join("\n");

  const [shell, amazon] = parse(xml).assigns;

  // On these old files the flags attribute does not exist yet, so it is
  // reconstructed: pre-0.8 rules always assigned payee and category, and
  // `exact="1"` becomes ASSIGN_FLAG_EXACT.
  assertEquals(
    shell.flags,
    ASSIGN_FLAG_DOPAY | ASSIGN_FLAG_DOCAT | ASSIGN_FLAG_EXACT,
  );
  assertEquals(amazon.flags, ASSIGN_FLAG_DOPAY | ASSIGN_FLAG_DOCAT);
});

Deno.test("the 0.7 migration overwrites whatever flags a newer-looking file carried", () => {
  const oldFormat = [
    '<?xml version="1.0"?>',
    '<homebank v="0.7" d="030000">',
    '<asg key="1" flags="2048" name="Shell"/>',
    "</homebank>",
    "",
  ].join("\n");

  const currentFormat = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<asg key="1" flags="2048" name="Shell"/>',
    "</homebank>",
    "",
  ].join("\n");

  // The version check is on the file, not the element: at v0.7 the flags
  // attribute is discarded and rebuilt, at v1.3 it is taken at face value.
  assertEquals(
    parse(oldFormat).assigns[0].flags,
    ASSIGN_FLAG_DOPAY | ASSIGN_FLAG_DOCAT,
  );
  assertEquals(parse(currentFormat).assigns[0].flags, 2048);
});
