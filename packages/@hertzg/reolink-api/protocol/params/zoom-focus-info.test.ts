import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { zoomFocusInfo } from "./zoom-focus-info.ts";

Deno.test("zoomFocusInfo decodes the <PtzZoomFocus> reply", () => {
  const root = parse(
    '<PtzZoomFocus version="1.1"><channelId>0</channelId>' +
      "<zoom><maxPos>1000</maxPos><minPos>0</minPos><curPos>100</curPos></zoom>" +
      "<focus><maxPos>900</maxPos><minPos>10</minPos><curPos>200</curPos></focus>" +
      "</PtzZoomFocus>",
  ).root;

  assertEquals(zoomFocusInfo.decode(root), {
    channelId: 0,
    zoom: { maxPos: 1000, minPos: 0, curPos: 100 },
    focus: { maxPos: 900, minPos: 10, curPos: 200 },
  });
});

Deno.test("zoomFocusInfo round-trips every field", () => {
  const value = {
    channelId: 2,
    zoom: { maxPos: 2000, minPos: 1, curPos: 300 },
    focus: { maxPos: 1500, minPos: 4, curPos: 400 },
  };

  assertEquals(
    zoomFocusInfo.decode(parse(zoomFocusInfo.encode(value)).root),
    value,
  );
});

Deno.test("zoomFocusInfo builds the request with only channelId", () => {
  assertEquals(
    zoomFocusInfo.encode({ channelId: 0 }),
    '<ZoomFocusInfo version="1.1"><channelId>0</channelId></ZoomFocusInfo>',
  );
});
