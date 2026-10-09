import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dingdongCtrl } from "./dingdong-ctrl.ts";

Deno.test("dingdongCtrl decodes a cmd 483 request", () => {
  const root = parse("<dingdongCtrl><opt>enter</opt></dingdongCtrl>").root;

  assertEquals(dingdongCtrl.decode(root), { opt: "enter" });
});

Deno.test("dingdongCtrl decodes an element without an option", () => {
  const root = parse("<dingdongCtrl></dingdongCtrl>").root;

  assertEquals(dingdongCtrl.decode(root), {});
});

Deno.test("dingdongCtrl rejects an option the firmware does not map", () => {
  const root = parse("<dingdongCtrl><opt>pair</opt></dingdongCtrl>").root;

  assertThrows(() => dingdongCtrl.decode(root), Error, '"pair"');
});

Deno.test("dingdongCtrl round-trips through encode and decode", () => {
  const value = { opt: "reset" as const };

  const xml = dingdongCtrl.encode(value);

  assertEquals(dingdongCtrl.decode(parse(xml).root), value);
});
