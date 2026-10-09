import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { floodlightStatusList } from "./floodlight-status-list.ts";

Deno.test("floodlightStatusList decodes the cmd 291 push", () => {
  const root = parse(
    '<FloodlightStatusList version="1.1">' +
      "<FloodlightStatus><channel>0</channel><status>1</status></FloodlightStatus>" +
      "<FloodlightStatus><channel>2</channel><status>0</status></FloodlightStatus>" +
      "</FloodlightStatusList>",
  ).root;

  assertEquals(floodlightStatusList.decode(root), {
    FloodlightStatus: [
      { channel: 0, status: 1 },
      { channel: 2, status: 0 },
    ],
  });
});

Deno.test("floodlightStatusList round-trips every field", () => {
  const value = { FloodlightStatus: [{ channel: 3, status: 1 }] };

  assertEquals(
    floodlightStatusList.decode(parse(floodlightStatusList.encode(value)).root),
    value,
  );
});

Deno.test("floodlightStatusList reads a push with no floodlights as empty", () => {
  const root = parse(
    '<FloodlightStatusList version="1.1"></FloodlightStatusList>',
  ).root;

  assertEquals(floodlightStatusList.decode(root).FloodlightStatus, []);
});

Deno.test("floodlightStatusList throws on an entry without status", () => {
  const root = parse(
    '<FloodlightStatusList version="1.1"><FloodlightStatus><channel>0</channel>' +
      "</FloodlightStatus></FloodlightStatusList>",
  ).root;

  assertThrows(() => floodlightStatusList.decode(root), Error, "<status>");
});
