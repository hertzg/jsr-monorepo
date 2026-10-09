import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { record } from "./record.ts";

Deno.test("record decodes the element the firmware writes", () => {
  const normal = "1".repeat(168);
  const motion = "0".repeat(24) + "1".repeat(144);
  const root = parse(
    '<Record version="1.1"><channelId>2</channelId><enable>1</enable>' +
      "<typeScheduleList>" +
      `<item><type>Normal</type><valueTable>${normal}</valueTable></item>` +
      `<item><type>MD</type><valueTable>${motion}</valueTable></item>` +
      "</typeScheduleList></Record>",
  ).root;

  assertEquals(record.decode(root), {
    channelId: 2,
    enable: 1,
    typeScheduleList: [
      { type: "Normal", valueTable: normal },
      { type: "MD", valueTable: motion },
    ],
  });
});

Deno.test("record round-trips through encode and decode", () => {
  const value = {
    channelId: 3,
    enable: 0,
    typeScheduleList: [{ type: "dog_cat", valueTable: "10".repeat(84) }],
  };

  assertEquals(record.decode(parse(record.encode(value)).root), value);
});

Deno.test("record decodes an empty schedule list", () => {
  const root = parse(
    '<Record version="1.1"><channelId>0</channelId><typeScheduleList></typeScheduleList></Record>',
  ).root;

  assertEquals(record.decode(root), { channelId: 0, typeScheduleList: [] });
});

Deno.test("record throws on a schedule item without a type", () => {
  const root = parse(
    '<Record version="1.1"><typeScheduleList><item><valueTable>1</valueTable></item>' +
      "</typeScheduleList></Record>",
  ).root;

  assertThrows(() => record.decode(root), Error, "<type>");
});
