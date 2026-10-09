import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { shelter } from "./shelter.ts";

Deno.test("shelter decodes the cmd 52 reply element", () => {
  const root = parse(
    '<Shelter version="1.1"><channelId>0</channelId><enable>1</enable>' +
      "<shelterList><Shelter><id>3</id><enable>1</enable><layer>1</layer>" +
      "<color>2</color><topLeftX>10</topLeftX><topLeftY>20</topLeftY>" +
      "<width>30</width><height>40</height></Shelter></shelterList></Shelter>",
  ).root;

  assertEquals(shelter.decode(root), {
    channelId: 0,
    enable: 1,
    shelterList: [{
      id: 3,
      enable: 1,
      layer: 1,
      color: 2,
      topLeftX: 10,
      topLeftY: 20,
      width: 30,
      height: 40,
    }],
  });
});

Deno.test("shelter decodes an empty mask list", () => {
  const root = parse(
    '<Shelter version="1.1"><channelId>0</channelId><enable>0</enable>' +
      "<shelterList></shelterList></Shelter>",
  ).root;

  assertEquals(shelter.decode(root).shelterList, []);
});

Deno.test("shelter round-trips two masks", () => {
  const value = {
    channelId: 1,
    enable: 1,
    shelterList: [
      { id: 0, enable: 1, topLeftX: 1, topLeftY: 2, width: 3, height: 4 },
      { id: 5, enable: 0 },
    ],
  };

  assertEquals(shelter.decode(parse(shelter.encode(value)).root), value);
});

Deno.test("shelter rejects a mask without id", () => {
  const root = parse(
    '<Shelter version="1.1"><shelterList><Shelter><width>3</width>' +
      "</Shelter></shelterList></Shelter>",
  ).root;

  assertThrows(() => shelter.decode(root), Error, "<id>");
});
