import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { heartBeat } from "./heart-beat.ts";

Deno.test("heartBeat decodes the timestamp the camera writes", () => {
  const root = parse(
    '<HeartBeat version="1.1"><size>12</size><sec>1700000123</sec>' +
      "<usec>456000</usec></HeartBeat>",
  ).root;

  assertEquals(heartBeat.decode(root), {
    size: 12,
    sec: 1700000123,
    usec: 456000,
  });
});

Deno.test("heartBeat round-trips through encode and decode", () => {
  const value = { size: 12, sec: 1700000777, usec: 999 };

  assertEquals(heartBeat.decode(parse(heartBeat.encode(value)).root), value);
});

Deno.test("heartBeat reads a timestamp without size", () => {
  const root = parse(
    "<HeartBeat><sec>1700000321</sec><usec>42</usec></HeartBeat>",
  ).root;

  assertEquals(heartBeat.decode(root), { sec: 1700000321, usec: 42 });
});

Deno.test("heartBeat throws without usec, which the firmware requires", () => {
  const root = parse("<HeartBeat><sec>1700000321</sec></HeartBeat>").root;

  assertThrows(() => heartBeat.decode(root), Error, "<usec>");
});
