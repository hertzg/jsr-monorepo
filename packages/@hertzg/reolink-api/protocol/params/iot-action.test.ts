import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { iotAction } from "./iot-action.ts";

Deno.test("iotAction decodes a request carrying every field", () => {
  const timeTable = "10".repeat(84);
  const root = parse(
    '<IOTAction version="1.1"><channelBits>18446744073709551615</channelBits>' +
      "<setState>1</setState><actionID>7</actionID><name>name-abc123</name>" +
      "<uid>uid-abc123</uid><content>content-abc123</content>" +
      `<alarmType>md</alarmType><timeTable>${timeTable}</timeTable></IOTAction>`,
  ).root;

  assertEquals(iotAction.decode(root), {
    channelBits: 18446744073709551615n,
    setState: 1,
    actionID: 7,
    name: "name-abc123",
    uid: "uid-abc123",
    content: "content-abc123",
    alarmType: "md",
    timeTable,
  });
});

Deno.test("iotAction round-trips through encode and decode", () => {
  const value = {
    channelBits: 5n,
    setState: 0,
    actionID: 3,
    name: "name-def456",
    uid: "uid-def456",
    content: "content-def456",
    alarmType: "people,dog_cat",
    timeTable: "01".repeat(84),
  };

  const xml = iotAction.encode(value);

  assertEquals(iotAction.decode(parse(xml).root), value);
});

Deno.test("iotAction decodes a request that only switches a device state", () => {
  const root = parse(
    '<IOTAction version="1.1"><setState>1</setState><uid>uid-ghi789</uid></IOTAction>',
  ).root;

  assertEquals(iotAction.decode(root), { setState: 1, uid: "uid-ghi789" });
});
