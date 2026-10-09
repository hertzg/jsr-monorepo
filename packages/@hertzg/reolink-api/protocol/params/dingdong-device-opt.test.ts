import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dingdongDeviceOpt } from "./dingdong-device-opt.ts";

Deno.test("dingdongDeviceOpt decodes every field net_dingdong_dev_opt_x2s reads", () => {
  const root = parse(
    "<dingdongDeviceOpt><id>2</id><opt>setParam</opt><musicId>4</musicId>" +
      "<volLevel>5</volLevel><ledState>1</ledState><name>Hallway</name>" +
      "</dingdongDeviceOpt>",
  ).root;

  assertEquals(dingdongDeviceOpt.decode(root), {
    id: 2,
    opt: "setParam",
    musicId: 4,
    volLevel: 5,
    ledState: 1,
    name: "Hallway",
  });
});

Deno.test("dingdongDeviceOpt decodes a cmd 485 getParam reply", () => {
  const root = parse(
    '<dingdongDeviceOpt version="1.1"><id>1</id><volLevel>3</volLevel>' +
      "<ledState>0</ledState><name>Office</name></dingdongDeviceOpt>",
  ).root;

  assertEquals(dingdongDeviceOpt.decode(root), {
    id: 1,
    volLevel: 3,
    ledState: 0,
    name: "Office",
  });
});

Deno.test("dingdongDeviceOpt rejects an option the firmware does not map", () => {
  const root = parse(
    "<dingdongDeviceOpt><opt>rename</opt></dingdongDeviceOpt>",
  ).root;

  assertThrows(() => dingdongDeviceOpt.decode(root), Error, '"rename"');
});

Deno.test("dingdongDeviceOpt round-trips through encode and decode", () => {
  const value = {
    id: 3,
    opt: "addDevice" as const,
    musicId: 2,
    volLevel: 4,
    ledState: 1,
    name: "Porch",
  };

  const xml = dingdongDeviceOpt.encode(value);

  assertEquals(dingdongDeviceOpt.decode(parse(xml).root), value);
});
