import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dingdongCfg } from "./dingdong-cfg.ts";

Deno.test("dingdongCfg decodes a cmd 486 reply with two chimes", () => {
  const root = parse(
    '<dingdongCfg version="1.1">' +
      "<deviceCfg><id>0</id><name>Front chime</name>" +
      "<alarminCfg><type>visitor</type><valid>1</valid><musicId>1</musicId></alarminCfg>" +
      "<alarminCfg><type>people</type><valid>0</valid><musicId>2</musicId></alarminCfg>" +
      "</deviceCfg>" +
      "<deviceCfg><id>1</id><name>Back chime</name>" +
      "<alarminCfg><type>MD</type><valid>1</valid><musicId>3</musicId></alarminCfg>" +
      "</deviceCfg></dingdongCfg>",
  ).root;

  assertEquals(dingdongCfg.decode(root), {
    deviceCfg: [
      {
        id: 0,
        name: "Front chime",
        alarminCfg: [
          { type: "visitor", valid: 1, musicId: 1 },
          { type: "people", valid: 0, musicId: 2 },
        ],
      },
      {
        id: 1,
        name: "Back chime",
        alarminCfg: [{ type: "MD", valid: 1, musicId: 3 }],
      },
    ],
  });
});

Deno.test("dingdongCfg decodes a cmd 487 request with a pair threshold", () => {
  const root = parse(
    "<dingdongCfg><pairThreshold>5</pairThreshold><deviceCfg><id>2</id>" +
      "<alarminCfg><type>dog_cat</type><valid>1</valid><musicId>4</musicId>" +
      "</alarminCfg></deviceCfg></dingdongCfg>",
  ).root;

  assertEquals(dingdongCfg.decode(root), {
    deviceCfg: [{
      id: 2,
      alarminCfg: [{ type: "dog_cat", valid: 1, musicId: 4 }],
    }],
    pairThreshold: 5,
  });
});

Deno.test("dingdongCfg decodes a chime with no supported alarms as an empty rule list", () => {
  const root = parse(
    '<dingdongCfg version="1.1"><deviceCfg><id>0</id><name>Chime</name>' +
      "</deviceCfg></dingdongCfg>",
  ).root;

  assertEquals(dingdongCfg.decode(root).deviceCfg[0].alarminCfg, []);
});

Deno.test("dingdongCfg rejects an alarm type the firmware does not map", () => {
  const root = parse(
    "<dingdongCfg><deviceCfg><alarminCfg><type>face</type></alarminCfg>" +
      "</deviceCfg></dingdongCfg>",
  ).root;

  assertThrows(() => dingdongCfg.decode(root), Error, '"face"');
});

Deno.test("dingdongCfg round-trips through encode and decode", () => {
  const value = {
    deviceCfg: [{
      id: 3,
      name: "Garage",
      alarminCfg: [
        { type: "package" as const, valid: 1, musicId: 5 },
        { type: "vehicle" as const, valid: 0, musicId: 6 },
      ],
    }],
    pairThreshold: 7,
  };

  const xml = dingdongCfg.encode(value);

  assertEquals(dingdongCfg.decode(parse(xml).root), value);
});
