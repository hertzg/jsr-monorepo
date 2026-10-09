import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { batteryRemainList } from "./battery-remain-list.ts";

Deno.test("batteryRemainList decodes the reply net_bat_remain_s2x writes", () => {
  const root = parse(
    '<BatteryRemainList version="1.1"><channelId>0</channelId>' +
      "<batteryTable>100,99,97,94,90</batteryTable></BatteryRemainList>",
  ).root;

  assertEquals(batteryRemainList.decode(root), {
    channelId: 0,
    batteryTable: "100,99,97,94,90",
  });
});

Deno.test("batteryRemainList round-trips a full value", () => {
  const value = { channelId: 1, batteryTable: "75,74,-1,73" };

  assertEquals(
    batteryRemainList.decode(parse(batteryRemainList.encode(value)).root),
    value,
  );
});

Deno.test("batteryRemainList decodes an empty table", () => {
  const root = parse(
    '<BatteryRemainList version="1.1"><channelId>0</channelId>' +
      "<batteryTable></batteryTable></BatteryRemainList>",
  ).root;

  assertEquals(batteryRemainList.decode(root).batteryTable, "");
});

Deno.test("batteryRemainList rejects a reply without batteryTable", () => {
  const root = parse(
    '<BatteryRemainList version="1.1"><channelId>0</channelId></BatteryRemainList>',
  ).root;

  assertThrows(() => batteryRemainList.decode(root), Error, "batteryTable");
});
