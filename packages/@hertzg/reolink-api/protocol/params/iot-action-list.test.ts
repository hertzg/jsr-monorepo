import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { iotActionList } from "./iot-action-list.ts";

Deno.test("iotActionList decodes the cmd 394 reply", () => {
  const timeTable = "0".repeat(24) + "1".repeat(144);
  const root = parse(
    '<IOTActionList version="1.1"><item><actionID>1</actionID>' +
      "<channelBits>1</channelBits><deviceType>2</deviceType>" +
      "<name>Porch light</name><uid>95270001ABCD</uid><content>on</content>" +
      "<alarmType>people,vehicle</alarmType>" +
      `<timeTable>${timeTable}</timeTable></item></IOTActionList>`,
  ).root;

  assertEquals(iotActionList.decode(root), {
    item: [{
      actionID: 1,
      channelBits: 1n,
      deviceType: 2,
      name: "Porch light",
      uid: "95270001ABCD",
      content: "on",
      alarmType: "people,vehicle",
      timeTable,
    }],
  });
});

Deno.test("iotActionList decodes an empty list", () => {
  const root = parse('<IOTActionList version="1.1"></IOTActionList>').root;

  assertEquals(iotActionList.decode(root), { item: [] });
});

Deno.test("iotActionList round-trips through encode and decode", () => {
  const value = {
    item: [
      {
        actionID: 1,
        channelBits: 1n,
        deviceType: 2,
        name: "Porch light",
        uid: "95270001ABCD",
        content: "on",
        alarmType: "md",
        timeTable: "1".repeat(168),
      },
      {
        actionID: 2,
        channelBits: 9223372036854775808n,
        deviceType: 1,
        name: "Garage plug",
        uid: "95270002EF01",
        content: "off",
        alarmType: "none",
        timeTable: "0".repeat(168),
      },
    ],
  };

  const xml = iotActionList.encode(value);

  assertEquals(iotActionList.decode(parse(xml).root), value);
});
