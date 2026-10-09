import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { periPheralStat } from "./peri-pheral-stat.ts";

Deno.test("periPheralStat encodes an empty element", () => {
  assertEquals(
    periPheralStat.encode({}),
    '<PeriPheralStat version="1.1"></PeriPheralStat>',
  );
});

Deno.test("periPheralStat ignores children, as the firmware parser does", () => {
  const root = parse(
    '<PeriPheralStat version="1.1"><charge>1</charge></PeriPheralStat>',
  ).root;

  assertEquals(periPheralStat.decode(root), {});
});

Deno.test("periPheralStat round-trips through encode and decode", () => {
  const xml = periPheralStat.encode({});

  assertEquals(periPheralStat.decode(parse(xml).root), {});
});
