import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { shutter } from "./shutter.ts";

Deno.test("shutter decodes the cmd 158 reply element", () => {
  const root = parse(
    '<Shutter version="1.1"><shutterLevel>1/10000</shutterLevel></Shutter>',
  ).root;

  assertEquals(shutter.decode(root), { shutterLevel: "1/10000" });
});

Deno.test("shutter round-trips a channel and speed", () => {
  const value = { channelId: 1, shutterLevel: "1/3" } as const;

  assertEquals(shutter.decode(parse(shutter.encode(value)).root), value);
});

Deno.test("shutter rejects a speed outside the firmware list", () => {
  const root = parse(
    '<Shutter version="1.1"><shutterLevel>1/7</shutterLevel></Shutter>',
  ).root;

  assertThrows(() => shutter.decode(root), Error, '"1/7"');
});
