import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { startZoomFocus } from "./start-zoom-focus.ts";

test("startZoomFocus decodes a zoom move", () => {
  const root = parse(
    '<StartZoomFocus version="1.1"><channelId>1</channelId>' +
      "<command>zoomPos</command><movePos>100</movePos></StartZoomFocus>",
  ).root;

  assertEquals(startZoomFocus.decode(root), {
    channelId: 1,
    command: "zoomPos",
    movePos: 100,
  });
});

test("startZoomFocus round-trips every field", () => {
  const value = { channelId: 0, command: "focusPos" as const, movePos: 250 };

  assertEquals(
    startZoomFocus.decode(parse(startZoomFocus.encode(value)).root),
    value,
  );
});

test("startZoomFocus throws on a command _get_ptz_cmd does not know", () => {
  const root = parse(
    '<StartZoomFocus version="1.1"><command>zoomTo</command></StartZoomFocus>',
  ).root;

  assertThrows(() => startZoomFocus.decode(root), Error, "zoomTo");
});
