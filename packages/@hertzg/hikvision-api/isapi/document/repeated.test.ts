import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { children } from "./children.ts";
import { int } from "./int.ts";
import { obj } from "./obj.ts";
import { repeated } from "./repeated.ts";

test("repeated decodes every element in order", () => {
  const root = parse(
    "<List><Item><id>1</id></Item><Other/><Item><id>2</id></Item></List>",
  ).root;

  assertEquals(
    repeated(obj({ id: int() })).decodeAll(children(root, "Item")),
    [{ id: 1 }, { id: 2 }],
  );
});

test("repeated decodes no elements as an empty array", () => {
  assertEquals(repeated(int()).decodeAll([]), []);
});
