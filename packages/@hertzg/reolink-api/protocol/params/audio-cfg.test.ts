import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { audioCfg } from "./audio-cfg.ts";

Deno.test("audioCfg decodes the reply nets_audio_cfg_s2x writes", () => {
  const root = parse(
    '<audioCfg version="1.1"><channelId>1</channelId><timeout>12</timeout>' +
      "<audioSelect>2</audioSelect><volume>75</volume><preAlarm>1</preAlarm>" +
      "</audioCfg>",
  ).root;

  assertEquals(audioCfg.decode(root), {
    channelId: 1,
    timeout: 12,
    audioSelect: 2,
    volume: 75,
    preAlarm: 1,
  });
});

Deno.test("audioCfg round-trips a full value", () => {
  const value = {
    channelId: 0,
    timeout: 30,
    audioSelect: 3,
    volume: 100,
    preAlarm: 0,
  };

  assertEquals(audioCfg.decode(parse(audioCfg.encode(value)).root), value);
});

Deno.test("audioCfg decodes a set request that changes only the volume", () => {
  const root = parse(
    '<audioCfg version="1.1"><channelId>0</channelId><volume>40</volume></audioCfg>',
  ).root;

  assertEquals(audioCfg.decode(root), { channelId: 0, volume: 40 });
});

Deno.test("audioCfg reads the Video Doorbell PoE's visitorLoudspeaker", () => {
  const root = parse(
    '<audioCfg version="1.1"><channelId>0</channelId>' +
      "<visitorLoudspeaker>3</visitorLoudspeaker></audioCfg>",
  ).root;

  assertEquals(audioCfg.decode(root), { channelId: 0, visitorLoudspeaker: 3 });
});
