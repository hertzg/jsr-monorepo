import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { int } from "./int.ts";
import { obj } from "./obj.ts";
import { optional } from "./optional.ts";

test("obj decodes its fields from the element's children", () => {
  const element = parse(
    "<Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>",
  ).root;

  const grid = obj({ rowGranularity: int(), columnGranularity: int() });

  assertEquals(grid.decode(element), {
    rowGranularity: 18,
    columnGranularity: 22,
  });
});

test("obj nests", () => {
  const element = parse("<A><B><c>1</c></B></A>").root;

  assertEquals(obj({ B: obj({ c: int() }) }).decode(element), { B: { c: 1 } });
});

test("obj throws for a missing required child naming the element", () => {
  const element =
    parse("<Grid><rowGranularity>18</rowGranularity></Grid>").root;

  assertThrows(
    () => obj({ columnGranularity: int() }).decode(element),
    Error,
    "ISAPI <Grid> has no <columnGranularity>",
  );
});

test("obj leaves an absent optional child out", () => {
  const element = parse("<Grid/>").root;

  assertEquals(obj({ rows: optional(int()) }).decode(element), {});
});
