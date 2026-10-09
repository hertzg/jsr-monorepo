import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { cropSnapReply } from "./crop-snap-reply.ts";

Deno.test("cropSnapReply decodes the cmd 230 reply", () => {
  const root = parse(
    '<cropSnap version="1.1"><channelId>0</channelId>' +
      "<pictureSize>48213</pictureSize></cropSnap>",
  ).root;

  assertEquals(cropSnapReply.decode(root), {
    channelId: 0,
    pictureSize: 48213,
  });
});

Deno.test("cropSnapReply round-trips through encode and decode", () => {
  const value = { channelId: 2, pictureSize: 130072 };

  const xml = cropSnapReply.encode(value);

  assertEquals(cropSnapReply.decode(parse(xml).root), value);
});

Deno.test("cropSnapReply rejects a reply without the picture size", () => {
  const root = parse(
    '<cropSnap version="1.1"><channelId>0</channelId></cropSnap>',
  ).root;

  assertThrows(() => cropSnapReply.decode(root), Error, "<pictureSize>");
});
