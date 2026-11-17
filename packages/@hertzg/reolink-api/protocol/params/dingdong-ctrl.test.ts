import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dingdongCtrl } from "./dingdong-ctrl.ts";

test("dingdongCtrl decodes a cmd 483 request", () => {
  const root = parse("<dingdongCtrl><opt>enter</opt></dingdongCtrl>").root;

  assertEquals(dingdongCtrl.decode(root), { opt: "enter" });
});

test("dingdongCtrl decodes an element without an option", () => {
  const root = parse("<dingdongCtrl></dingdongCtrl>").root;

  assertEquals(dingdongCtrl.decode(root), {});
});

test("dingdongCtrl rejects an option the firmware does not map", () => {
  const root = parse("<dingdongCtrl><opt>pair</opt></dingdongCtrl>").root;

  assertThrows(() => dingdongCtrl.decode(root), Error, '"pair"');
});

test("dingdongCtrl round-trips through encode and decode", () => {
  const value = { opt: "reset" as const };

  const xml = dingdongCtrl.encode(value);

  assertEquals(dingdongCtrl.decode(parse(xml).root), value);
});
