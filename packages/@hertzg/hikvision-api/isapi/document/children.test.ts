import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { children } from "./children.ts";

test("children returns the elements of the name in document order", () => {
  const root = parse("<L><Item>a</Item><Other/><Item>b</Item></L>").root;

  assertEquals(
    children(root, "Item").map((el) => el.children.length),
    [1, 1],
  );
});

test("children returns an empty array when none match", () => {
  const root = parse("<L><Item/></L>").root;

  assertEquals(children(root, "Missing"), []);
});

test("children ignores text nodes", () => {
  const root = parse("<L>text<Item/>more</L>").root;

  assertEquals(children(root, "Item").length, 1);
});
