import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { osdChannelName } from "./osd-channel-name.ts";

Deno.test("osdChannelName decodes the cmd 44 reply element", () => {
  const root = parse(
    '<OsdChannelName version="1.1"><channelId>0</channelId>' +
      "<name>Front door</name><enable>1</enable><topLeftX>12</topLeftX>" +
      "<topLeftY>34</topLeftY><enWatermark>0</enWatermark>" +
      "<enBgcolor>1</enBgcolor></OsdChannelName>",
  ).root;

  assertEquals(osdChannelName.decode(root), {
    channelId: 0,
    name: "Front door",
    enable: 1,
    topLeftX: 12,
    topLeftY: 34,
    enWatermark: 0,
    enBgcolor: 1,
  });
});

Deno.test("osdChannelName round-trips every field", () => {
  const value = {
    channelId: 1,
    name: "Back & yard",
    enable: 0,
    topLeftX: 56,
    topLeftY: 78,
    enWatermark: 1,
    enBgcolor: 0,
  };

  assertEquals(
    osdChannelName.decode(parse(osdChannelName.encode(value)).root),
    value,
  );
});
