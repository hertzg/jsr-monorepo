import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { osdDatetime } from "./osd-datetime.ts";

Deno.test("osdDatetime decodes the cmd 44 reply element", () => {
  const root = parse(
    '<OsdDatetime version="1.1"><channelId>0</channelId><enable>1</enable>' +
      "<topLeftX>11</topLeftX><topLeftY>22</topLeftY><width>333</width>" +
      "<height>44</height><language>Chinese</language></OsdDatetime>",
  ).root;

  assertEquals(osdDatetime.decode(root), {
    channelId: 0,
    enable: 1,
    topLeftX: 11,
    topLeftY: 22,
    width: 333,
    height: 44,
    language: "Chinese",
  });
});

Deno.test("osdDatetime round-trips every field", () => {
  const value = {
    channelId: 2,
    enable: 0,
    topLeftX: 5,
    topLeftY: 6,
    width: 70,
    height: 8,
    language: "English",
  } as const;

  assertEquals(
    osdDatetime.decode(parse(osdDatetime.encode(value)).root),
    value,
  );
});

Deno.test("osdDatetime rejects a language the camera never writes", () => {
  const root = parse(
    '<OsdDatetime version="1.1"><language>German</language></OsdDatetime>',
  ).root;

  assertThrows(() => osdDatetime.decode(root), Error, '"German"');
});
