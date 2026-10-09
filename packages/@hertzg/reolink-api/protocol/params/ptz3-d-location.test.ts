import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ptz3DLocation } from "./ptz3-d-location.ts";

Deno.test("ptz3DLocation decodes a request carrying every field", () => {
  const root = parse(
    '<Ptz3DLocation version="1.1"><channelId>1</channelId>' +
      "<topLeftX>12.5</topLeftX><topLeftY>34.25</topLeftY>" +
      "<width>640</width><height>360.75</height><speed>48</speed>" +
      "<streamType>externStream</streamType></Ptz3DLocation>",
  ).root;

  assertEquals(ptz3DLocation.decode(root), {
    channelId: 1,
    topLeftX: 12.5,
    topLeftY: 34.25,
    width: 640,
    height: 360.75,
    speed: 48,
    streamType: "externStream",
  });
});

Deno.test("ptz3DLocation round-trips through encode and decode", () => {
  const value = {
    channelId: 0,
    topLeftX: 100.125,
    topLeftY: 200.5,
    width: 320,
    height: 180,
    speed: 16,
    streamType: "mobileStream" as const,
  };

  const xml = ptz3DLocation.encode(value);

  assertEquals(ptz3DLocation.decode(parse(xml).root), value);
});

Deno.test("ptz3DLocation decodes a request without a stream type", () => {
  const root = parse(
    '<Ptz3DLocation version="1.1"><width>64</width><height>48</height></Ptz3DLocation>',
  ).root;

  assertEquals(ptz3DLocation.decode(root), { width: 64, height: 48 });
});

Deno.test("ptz3DLocation rejects a stream type the firmware does not map", () => {
  const root = parse(
    '<Ptz3DLocation version="1.1"><streamType>thirdStream</streamType></Ptz3DLocation>',
  ).root;

  assertThrows(() => ptz3DLocation.decode(root), Error, "streamType");
});
