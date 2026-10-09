import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ptzZoomFocus } from "./ptz-zoom-focus.ts";

Deno.test("ptzZoomFocus decodes the cmd 294 reply", () => {
  const root = parse(
    '<PtzZoomFocus version="1.1"><channelId>0</channelId>' +
      "<zoom><maxPos>32</maxPos><minPos>0</minPos><curPos>5</curPos></zoom>" +
      "<focus><maxPos>248</maxPos><minPos>0</minPos><curPos>117</curPos></focus>" +
      "</PtzZoomFocus>",
  ).root;

  assertEquals(ptzZoomFocus.decode(root), {
    channelId: 0,
    zoom: { maxPos: 32, minPos: 0, curPos: 5 },
    focus: { maxPos: 248, minPos: 0, curPos: 117 },
  });
});

Deno.test("ptzZoomFocus round-trips through encode and decode", () => {
  const value = {
    channelId: 1,
    zoom: { maxPos: 16, minPos: 1, curPos: 16 },
    focus: { maxPos: 200, minPos: 10, curPos: 10 },
  };

  const xml = ptzZoomFocus.encode(value);

  assertEquals(ptzZoomFocus.decode(parse(xml).root), value);
});

Deno.test("ptzZoomFocus rejects a reply without the focus motor", () => {
  const root = parse(
    '<PtzZoomFocus version="1.1"><channelId>0</channelId>' +
      "<zoom><maxPos>32</maxPos><minPos>0</minPos><curPos>5</curPos></zoom>" +
      "</PtzZoomFocus>",
  ).root;

  assertThrows(() => ptzZoomFocus.decode(root), Error, "<focus>");
});
