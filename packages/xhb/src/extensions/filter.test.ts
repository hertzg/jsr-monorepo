import { assertEquals } from "@std/assert";
import {
  filterExtension,
  type FilterGroups,
  parseFilterGroups,
  serializeFilterGroups,
} from "./filter.ts";

Deno.test("parseFilterGroups - parses date group with simple range", () => {
  const groups = parseFilterGroups({ dat: "1|2" });

  assertEquals(groups.dat, { option: 1, range: 2, mindate: 0, maxdate: 0 });
});

Deno.test("parseFilterGroups - parses date group with custom range", () => {
  const groups = parseFilterGroups({ dat: "1|1,100,200" });

  assertEquals(groups.dat, {
    option: 1,
    range: 1,
    mindate: 100,
    maxdate: 200,
  });
});

Deno.test("parseFilterGroups - parses account key group", () => {
  const groups = parseFilterGroups({ acc: "1|3,5,7" });

  assertEquals(groups.acc, { option: 1, keys: [3, 5, 7] });
});

Deno.test("parseFilterGroups - parses payee key group", () => {
  const groups = parseFilterGroups({ pay: "2|10,20" });

  assertEquals(groups.pay, { option: 2, keys: [10, 20] });
});

Deno.test("parseFilterGroups - parses category key group", () => {
  const groups = parseFilterGroups({ cat: "1|1,2,3" });

  assertEquals(groups.cat, { option: 1, keys: [1, 2, 3] });
});

Deno.test("parseFilterGroups - parses tag key group", () => {
  const groups = parseFilterGroups({ tag: "1|4,8" });

  assertEquals(groups.tag, { option: 1, keys: [4, 8] });
});

Deno.test("parseFilterGroups - parses status group", () => {
  const groups = parseFilterGroups({ sta: "1|1,0,1" });

  assertEquals(groups.sta, { option: 1, non: 1, clr: 0, rec: 1 });
});

Deno.test("parseFilterGroups - parses type group", () => {
  const groups = parseFilterGroups({ typ: "2|1,0,1,0" });

  assertEquals(groups.typ, {
    option: 2,
    nexp: 1,
    ninc: 0,
    xexp: 1,
    xinc: 0,
  });
});

Deno.test("parseFilterGroups - parses paymode group", () => {
  const groups = parseFilterGroups({ mod: "1|0,2,4,6" });

  assertEquals(groups.mod, { option: 1, modes: [0, 2, 4, 6] });
});

Deno.test("parseFilterGroups - parses amount group", () => {
  const groups = parseFilterGroups({ amt: "1|10.5,500" });

  assertEquals(groups.amt, { option: 1, minamount: 10.5, maxamount: 500 });
});

Deno.test("parseFilterGroups - parses text group", () => {
  const groups = parseFilterGroups({ txt: "1|1\u00a4rent\u00a4CHK001" });

  assertEquals(groups.txt, {
    option: 1,
    exact: 1,
    memo: "rent",
    number: "CHK001",
  });
});

Deno.test("parseFilterGroups - returns empty object for no filter attrs", () => {
  const groups = parseFilterGroups({ key: "1", name: "myfilter" });

  assertEquals(groups, {});
});

Deno.test("parseFilterGroups - parses multiple groups at once", () => {
  const groups = parseFilterGroups({
    dat: "1|2",
    sta: "1|1,0,1",
    typ: "2|1,0,1,0",
  });

  assertEquals(groups.dat?.option, 1);
  assertEquals(groups.sta?.non, 1);
  assertEquals(groups.typ?.nexp, 1);
});

Deno.test("serializeFilterGroups - serializes date group simple range", () => {
  const attrs = serializeFilterGroups({
    dat: { option: 1, range: 2, mindate: 0, maxdate: 0 },
  });

  assertEquals(attrs, ['dat="1|2"']);
});

Deno.test("serializeFilterGroups - serializes date group custom range", () => {
  const attrs = serializeFilterGroups({
    dat: { option: 1, range: 1, mindate: 100, maxdate: 200 },
  });

  assertEquals(attrs, ['dat="1|1,100,200"']);
});

Deno.test("serializeFilterGroups - serializes key groups", () => {
  const attrs = serializeFilterGroups({
    acc: { option: 1, keys: [3, 5, 7] },
  });

  assertEquals(attrs, ['acc="1|3,5,7"']);
});

Deno.test("serializeFilterGroups - serializes status group", () => {
  const attrs = serializeFilterGroups({
    sta: { option: 1, non: 1, clr: 0, rec: 1 },
  });

  assertEquals(attrs, ['sta="1|1,0,1"']);
});

Deno.test("serializeFilterGroups - serializes type group", () => {
  const attrs = serializeFilterGroups({
    typ: { option: 2, nexp: 1, ninc: 0, xexp: 1, xinc: 0 },
  });

  assertEquals(attrs, ['typ="2|1,0,1,0"']);
});

Deno.test("serializeFilterGroups - serializes paymode group", () => {
  const attrs = serializeFilterGroups({
    mod: { option: 1, modes: [0, 2, 4, 6] },
  });

  assertEquals(attrs, ['mod="1|0,2,4,6"']);
});

Deno.test("serializeFilterGroups - serializes amount group", () => {
  const attrs = serializeFilterGroups({
    amt: { option: 1, minamount: 10.5, maxamount: 500 },
  });

  assertEquals(attrs, ['amt="1|10.5,500"']);
});

Deno.test("serializeFilterGroups - serializes text group", () => {
  const attrs = serializeFilterGroups({
    txt: { option: 1, exact: 1, memo: "rent", number: "CHK001" },
  });

  assertEquals(attrs, ['txt="1|1\u00a4rent\u00a4CHK001"']);
});

Deno.test("serializeFilterGroups - omits groups with option 0", () => {
  const attrs = serializeFilterGroups({
    dat: { option: 0, range: 2, mindate: 0, maxdate: 0 },
    sta: { option: 0, non: 1, clr: 0, rec: 1 },
  });

  assertEquals(attrs, []);
});

Deno.test("serializeFilterGroups - returns empty for empty groups", () => {
  assertEquals(serializeFilterGroups({}), []);
});

Deno.test("serializeFilterGroups - preserves group ordering", () => {
  const attrs = serializeFilterGroups({
    dat: { option: 1, range: 2, mindate: 0, maxdate: 0 },
    acc: { option: 1, keys: [1] },
    pay: { option: 1, keys: [2] },
    cat: { option: 1, keys: [3] },
    tag: { option: 1, keys: [4] },
    txt: { option: 1, exact: 0, memo: "", number: "" },
    amt: { option: 1, minamount: 0, maxamount: 100 },
    mod: { option: 1, modes: [0] },
    sta: { option: 1, non: 0, clr: 0, rec: 0 },
    typ: { option: 1, nexp: 0, ninc: 0, xexp: 0, xinc: 0 },
  });

  assertEquals(attrs.length, 10);
  assertEquals(attrs[0].startsWith("dat="), true);
  assertEquals(attrs[1].startsWith("acc="), true);
  assertEquals(attrs[2].startsWith("pay="), true);
  assertEquals(attrs[3].startsWith("cat="), true);
  assertEquals(attrs[4].startsWith("tag="), true);
  assertEquals(attrs[5].startsWith("txt="), true);
  assertEquals(attrs[6].startsWith("amt="), true);
  assertEquals(attrs[7].startsWith("mod="), true);
  assertEquals(attrs[8].startsWith("sta="), true);
  assertEquals(attrs[9].startsWith("typ="), true);
});

Deno.test("filterExtension - round-trip parse and serialize", () => {
  const ext = filterExtension();
  const entity: Record<string, unknown> = {};

  ext.parse(
    { dat: "1|1,100,200", amt: "2|10.5,500" },
    entity,
  );

  const groups = entity["filterGroups"] as FilterGroups;
  assertEquals(groups.dat, {
    option: 1,
    range: 1,
    mindate: 100,
    maxdate: 200,
  });
  assertEquals(groups.amt, {
    option: 2,
    minamount: 10.5,
    maxamount: 500,
  });

  const attrs = ext.serialize(entity);
  assertEquals(attrs, [
    'dat="1|1,100,200"',
    'amt="2|10.5,500"',
  ]);
});

Deno.test("filterExtension - parse with no filter attrs sets empty object", () => {
  const ext = filterExtension();
  const entity: Record<string, unknown> = {};

  ext.parse({ key: "1", name: "test" }, entity);
  assertEquals(entity["filterGroups"], {});
});

Deno.test("filterExtension - serialize with no filterGroups returns empty", () => {
  const ext = filterExtension();
  assertEquals(ext.serialize({}), []);
  assertEquals(ext.serialize({ filterGroups: null }), []);
  assertEquals(ext.serialize({ filterGroups: 42 }), []);
});
