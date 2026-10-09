import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ptzControl } from "./ptz-control.ts";

Deno.test("ptzControl decodes a patrol request", () => {
  const root = parse(
    '<PtzControl version="1.1"><channelId>0</channelId>' +
      "<command>startPatrol</command><patrolId>2</patrolId></PtzControl>",
  ).root;

  assertEquals(ptzControl.decode(root), {
    channelId: 0,
    command: "startPatrol",
    patrolId: 2,
  });
});

Deno.test("ptzControl round-trips through encode and decode", () => {
  const value = {
    channelId: 1,
    command: "toPos" as const,
    patrolId: 3,
    keyPos: 4,
    presetId: 5,
    patternId: 1,
    speed: 60,
    dwellTime: 7,
  };

  assertEquals(ptzControl.decode(parse(ptzControl.encode(value)).root), value);
});

Deno.test("ptzControl rejects a command _get_ptz_cmd does not accept", () => {
  const root = parse("<PtzControl><command>spin</command></PtzControl>").root;

  assertThrows(() => ptzControl.decode(root), Error, "expected one of");
});
