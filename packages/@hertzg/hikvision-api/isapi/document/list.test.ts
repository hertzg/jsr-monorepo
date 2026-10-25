import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { children } from "./children.ts";
import { int } from "./int.ts";
import { list } from "./list.ts";
import { obj } from "./obj.ts";

test("list reads the items under the wrapper", () => {
  const root = parse(
    "<Root><RegionList><Region><id>1</id></Region><Region><id>2</id></Region></RegionList></Root>",
  ).root;

  assertEquals(
    list("Region", obj({ id: int() })).decodeAll(children(root, "RegionList")),
    [{ id: 1 }, { id: 2 }],
  );
});

test("list reads a missing wrapper as an empty array", () => {
  assertEquals(list("Region", int()).decodeAll([]), []);
});

test("list reads an empty wrapper as an empty array", () => {
  const root = parse("<Root><RegionList/></Root>").root;

  assertEquals(
    list("Region", int()).decodeAll(children(root, "RegionList")),
    [],
  );
});

test("list ignores other children of the wrapper", () => {
  const root =
    parse("<Root><RegionList><Other/><Region>1</Region></RegionList></Root>")
      .root;

  assertEquals(list("Region", int()).decodeAll(children(root, "RegionList")), [
    1,
  ]);
});
