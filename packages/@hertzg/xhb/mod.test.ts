import { assertEquals } from "@std/assert";
import { parse, serialize } from "./mod.ts";

const save = (name: string) =>
  Deno.readTextFileSync(new URL(`./fixtures/saves/${name}`, import.meta.url));

Deno.test("a real HomeBank 5.2.4 save round-trips byte for byte", () => {
  const original = save("example-v5.2.4.xhb");
  assertEquals(serialize(parse(original)), original);
});

Deno.test("a real HomeBank 5.3.1 save round-trips byte for byte", () => {
  const original = save("example-v5.3.1.xhb");
  assertEquals(serialize(parse(original)), original);
});

Deno.test("a real HomeBank 5.4.2 save round-trips byte for byte", () => {
  const original = save("example-v5.4.2.xhb");
  assertEquals(serialize(parse(original)), original);
});

Deno.test("a whole file is a flat list of elements under <homebank>, one array per entity", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<properties title="John Money" curr="1"/>',
    '<cur key="1" flags="0" iso="GBP" name="Pound Sterling" symb="£" syprf="1" dchar="." gchar="," frac="2" rate="0" mdate="0"/>',
    '<account key="1" pos="1" type="1" curr="1" name="Cheque Account"/>',
    '<pay key="1" name="Amazon"/>',
    '<cat key="1" name="Food"/>',
    '<tag key="1" name="groceries"/>',
    '<asg key="1" flags="2" field="1" name="Amazon" payee="1"/>',
    '<fav key="1" amount="-15" account="1" wording="Donation" nextdate="731961" every="1" unit="2"/>',
    '<ope date="736968" amount="-42.5" account="1" payee="1" category="1"/>',
    "</homebank>",
    "",
  ].join("\n");

  const xhb = parse(xml);

  // Nothing is nested: relationships between entities are integer keys.
  assertEquals(xhb.properties?.owner, "John Money");
  assertEquals(xhb.currencies.length, 1);
  assertEquals(xhb.accounts.length, 1);
  assertEquals(xhb.payees.length, 1);
  assertEquals(xhb.categories.length, 1);
  assertEquals(xhb.tags.length, 1);
  assertEquals(xhb.assigns.length, 1);
  assertEquals(xhb.archives.length, 1);
  assertEquals(xhb.operations.length, 1);
});

Deno.test("serialize writes entities in HomeBank's order, whatever order they were read in", () => {
  const shuffled = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<ope date="736968" amount="-42.5" account="1"/>',
    '<tag key="1" name="groceries"/>',
    '<cat key="1" name="Food"/>',
    '<pay key="1" name="Amazon"/>',
    '<account key="1" pos="1" type="1" curr="1" name="Cheque Account"/>',
    '<cur key="1" flags="0" iso="GBP" name="Pound Sterling" symb="£" syprf="1" dchar="." gchar="," frac="2" rate="0" mdate="0"/>',
    '<properties title="John Money" curr="1"/>',
    "</homebank>",
    "",
  ].join("\n");

  // properties, currencies, accounts, payees, categories, tags, assigns,
  // archives, operations — the order HomeBank itself writes.
  assertEquals(
    serialize(parse(shuffled)),
    [
      '<?xml version="1.0"?>',
      '<homebank v="1.3" d="050402">',
      // `auto_smode` is one of the few attributes written even at zero.
      '<properties title="John Money" curr="1" auto_smode="0"/>',
      '<cur key="1" flags="0" iso="GBP" name="Pound Sterling" symb="£" syprf="1" dchar="." gchar="," frac="2" rate="0" mdate="0"/>',
      '<account key="1" pos="1" type="1" curr="1" name="Cheque Account"/>',
      '<pay key="1" name="Amazon"/>',
      '<cat key="1" name="Food"/>',
      '<tag key="1" name="groceries"/>',
      '<ope date="736968" amount="-42.5" account="1"/>',
      "</homebank>",
      "",
    ].join("\n"),
  );
});

Deno.test("elements the format does not define are dropped, as is a missing <properties>", () => {
  const xml = [
    '<?xml version="1.0"?>',
    '<homebank v="1.3" d="050402">',
    '<future-entity key="1" name="from a newer HomeBank"/>',
    '<pay key="1" name="Amazon"/>',
    "</homebank>",
    "",
  ].join("\n");

  // The library round-trips what it understands and nothing else, so an
  // unknown element is lost rather than preserved.
  assertEquals(
    serialize(parse(xml)),
    [
      '<?xml version="1.0"?>',
      '<homebank v="1.3" d="050402">',
      '<pay key="1" name="Amazon"/>',
      "</homebank>",
      "",
    ].join("\n"),
  );
});
