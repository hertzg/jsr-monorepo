import { assertEquals } from "@std/assert";
import { parse, serialize } from "./mod.ts";
import { CATEGORY_FLAG_BUDGET, CATEGORY_FLAG_SUB } from "./category.ts";

Deno.test("a category is a name, an optional parent and a budget table", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<cat key="11" name="Food"/>',
    '<cat key="12" parent="11" flags="9" name="Grocer" b0="-40"/>',
    "</homebank>",
    "",
  ].join("\n");

  const [food, grocer] = parse(xml).categories;

  // A top-level category has no parent, no flags and no budget attributes.
  assertEquals(food.key, 11);
  assertEquals(food.parent, 0);
  assertEquals(food.flags, 0);
  assertEquals(food.budgets.length, 12);

  assertEquals(grocer.parent, 11);
  assertEquals(grocer.flags, CATEGORY_FLAG_SUB | CATEGORY_FLAG_BUDGET);
  assertEquals(grocer.budgets[0], "-40");

  assertEquals(serialize(parse(xml)), xml);
});

Deno.test("budgets are the b0..b12 attributes: b0 is the every-month amount, b1..b12 the individual months", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<cat key="1" flags="8" name="Heating" b1="-120" b12="-95"/>',
    "</homebank>",
    "",
  ].join("\n");

  const [heating] = parse(xml).categories;

  // Slots the XML did not mention are left as holes, not zeroes, so a
  // category budgeted only in December still reports 13 slots.
  assertEquals(heating.budgets[1], "-120");
  assertEquals(heating.budgets[12], "-95");
  assertEquals(heating.budgets.length, 13);
  assertEquals(0 in heating.budgets, false);
});

Deno.test("budgets are renumbered from b0 when serialized, so a gap shifts the months", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<cat key="1" flags="8" name="Heating" b1="-120" b12="-95"/>',
    "</homebank>",
    "",
  ].join("\n");

  // The serializer compacts the budget list before numbering it, so b1/b12
  // come back as b0/b1 and the only case that survives untouched is a
  // category budgeted from b0 with no gaps. Treated here as a faithful
  // artifact of the C original (ADR 0001/0003) and asserted as-is.
  assertEquals(
    serialize(parse(xml)).split("\n")[2],
    '<cat key="1" flags="8" name="Heating" b0="-120" b1="-95"/>',
  );
});
