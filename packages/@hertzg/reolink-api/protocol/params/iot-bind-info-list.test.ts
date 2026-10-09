import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { iotBindInfoList } from "./iot-bind-info-list.ts";

Deno.test("iotBindInfoList decodes the reply the camera writes", () => {
  const root = parse(
    '<IOTBindInfoList version="1.1">' +
      "<item><deviceType>1</deviceType><name>name-abc123</name>" +
      "<uid>uid-abc123</uid><mode>2</mode></item>" +
      "<item><deviceType>3</deviceType><name>name-def456</name>" +
      "<uid>uid-def456</uid><mode>4</mode></item>" +
      "</IOTBindInfoList>",
  ).root;

  assertEquals(iotBindInfoList.decode(root), {
    item: [
      { deviceType: 1, name: "name-abc123", uid: "uid-abc123", mode: 2 },
      { deviceType: 3, name: "name-def456", uid: "uid-def456", mode: 4 },
    ],
  });
});

Deno.test("iotBindInfoList round-trips a reply through encode and decode", () => {
  const value = {
    item: [
      { deviceType: 5, name: "name-ghi789", uid: "uid-ghi789", mode: 6 },
    ],
  };

  const xml = iotBindInfoList.encode(value);

  assertEquals(iotBindInfoList.decode(parse(xml).root), value);
});

Deno.test("iotBindInfoList round-trips a request through encode and decode", () => {
  const value = {
    info: [
      { devName: "devname-jkl012", uid: "uid-jkl012" },
      { uid: "uid-mno345" },
    ],
  };

  const xml = iotBindInfoList.encode(value);

  assertEquals(iotBindInfoList.decode(parse(xml).root), value);
});

Deno.test("iotBindInfoList decodes an empty list as no devices", () => {
  const root = parse('<IOTBindInfoList version="1.1"></IOTBindInfoList>').root;

  assertEquals(iotBindInfoList.decode(root), {});
});
