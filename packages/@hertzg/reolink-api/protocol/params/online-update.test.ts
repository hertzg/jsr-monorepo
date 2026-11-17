import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { onlineUpdate } from "./online-update.ts";

test("onlineUpdate decodes a cmd 191 request", () => {
  const root = parse(
    '<OnlineUpdate version="1.1"><needUpdate>1</needUpdate></OnlineUpdate>',
  ).root;

  assertEquals(onlineUpdate.decode(root), { needUpdate: 1 });
});

test("onlineUpdate decodes an empty element", () => {
  const root = parse('<OnlineUpdate version="1.1"></OnlineUpdate>').root;

  assertEquals(onlineUpdate.decode(root), {});
});

test("onlineUpdate round-trips through encode and decode", () => {
  const value = { needUpdate: 0 };

  const xml = onlineUpdate.encode(value);

  assertEquals(onlineUpdate.decode(parse(xml).root), value);
});
