import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { preview } from "./preview.ts";

Deno.test("preview decodes a stream request", () => {
  const root = parse(
    '<Preview version="1.1"><channelId>1</channelId><handle>7</handle>' +
      "<streamType>mobileStream</streamType></Preview>",
  ).root;

  assertEquals(preview.decode(root), {
    channelId: 1,
    handle: 7,
    streamType: "mobileStream",
  });
});

Deno.test("preview round-trips through encode and decode", () => {
  const value = {
    channelId: 2,
    handle: 3,
    streamType: "externStream" as const,
    preRec: 4,
    resolution: 5,
    fps: 25,
  };

  assertEquals(preview.decode(parse(preview.encode(value)).root), value);
});

Deno.test("preview rejects a stream type the firmware does not name", () => {
  const root = parse("<Preview><streamType>thirdStream</streamType></Preview>")
    .root;

  assertThrows(() => preview.decode(root), Error, "mainStream");
});

Deno.test("preview round-trips a Video Doorbell PoE aiYuvData request", () => {
  const value = {
    channelId: 0,
    handle: 4,
    streamType: "aiYuvData" as const,
    needTLV: 1,
    gapms: 200,
    resoWidth: 640,
    resoHeight: 360,
    algorithm: 2,
  };

  assertEquals(preview.decode(parse(preview.encode(value)).root), value);
});
