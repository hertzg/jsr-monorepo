import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dingdongList } from "./dingdong-list.ts";

Deno.test("dingdongList decodes a cmd 484 reply from net_dingdong_list_s2x", () => {
  const root = parse(
    '<dingdongList version="1.1"><maxPairNumber>10</maxPairNumber>' +
      "<pairedList>" +
      "<dingdongDeviceInfo><id>0</id><netstate>1</netstate>" +
      "<name>Front chime</name></dingdongDeviceInfo>" +
      "<dingdongDeviceInfo><id>1</id><netstate>0</netstate>" +
      "<name>Back chime</name></dingdongDeviceInfo>" +
      "</pairedList></dingdongList>",
  ).root;

  assertEquals(dingdongList.decode(root), {
    maxPairNumber: 10,
    pairedList: [
      { id: 0, netstate: 1, name: "Front chime" },
      { id: 1, netstate: 0, name: "Back chime" },
    ],
  });
});

Deno.test("dingdongList decodes the cmd 484 push with netState in camel case", () => {
  const root = parse(
    '<dingdongList version="1.1"><maxPairNumber>4</maxPairNumber>' +
      "<pairedList><dingdongDeviceInfo><id>3</id><name>Garage</name>" +
      "<netState>1</netState></dingdongDeviceInfo></pairedList></dingdongList>",
  ).root;

  assertEquals(dingdongList.decode(root), {
    maxPairNumber: 4,
    pairedList: [{ id: 3, name: "Garage", netState: 1 }],
  });
});

Deno.test("dingdongList decodes a cmd 490 scan push", () => {
  const root = parse(
    '<dingdongList version="1.1"><scanList>' +
      "<dingdongDeviceInfo><id>5</id><name>New chime</name></dingdongDeviceInfo>" +
      "</scanList></dingdongList>",
  ).root;

  assertEquals(dingdongList.decode(root), {
    scanList: [{ id: 5, name: "New chime" }],
  });
});

Deno.test("dingdongList decodes an empty paired list", () => {
  const root = parse(
    '<dingdongList version="1.1"><maxPairNumber>10</maxPairNumber>' +
      "<pairedList></pairedList></dingdongList>",
  ).root;

  assertEquals(dingdongList.decode(root).pairedList, []);
});

Deno.test("dingdongList rejects a paired device without a name", () => {
  const root = parse(
    "<dingdongList><pairedList><dingdongDeviceInfo><id>0</id>" +
      "</dingdongDeviceInfo></pairedList></dingdongList>",
  ).root;

  assertThrows(() => dingdongList.decode(root), Error, "<name>");
});

Deno.test("dingdongList round-trips through encode and decode", () => {
  const value = {
    maxPairNumber: 8,
    pairedList: [{ id: 6, netstate: 1, name: "Kitchen", netState: 0 }],
    scanList: [{ id: 7, name: "Porch" }],
  };

  const xml = dingdongList.encode(value);

  assertEquals(dingdongList.decode(parse(xml).root), value);
});
