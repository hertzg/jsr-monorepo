import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { periPheralStat } from "./peri-pheral-stat.ts";

test("periPheralStat encodes an empty element", () => {
  assertEquals(
    periPheralStat.encode({}),
    '<PeriPheralStat version="1.1"></PeriPheralStat>',
  );
});

test("periPheralStat ignores children, as the firmware parser does", () => {
  const root = parse(
    '<PeriPheralStat version="1.1"><charge>1</charge></PeriPheralStat>',
  ).root;

  assertEquals(periPheralStat.decode(root), {});
});

test("periPheralStat round-trips through encode and decode", () => {
  const xml = periPheralStat.encode({});

  assertEquals(periPheralStat.decode(parse(xml).root), {});
});
