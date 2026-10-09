import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { talkAbility } from "./talk-ability.ts";

Deno.test("talkAbility decodes the reply the camera writes", () => {
  const root = parse(
    '<TalkAbility version="1.1">' +
      "<duplexList><duplex>FDX</duplex><duplex>HDX</duplex></duplexList>" +
      "<audioStreamModeList><audioStreamMode>followVideoStream</audioStreamMode>" +
      "</audioStreamModeList>" +
      "<audioConfigList><audioConfig><priority>0</priority>" +
      "<audioType>adpcm</audioType><sampleRate>16000</sampleRate>" +
      "<samplePrecision>16</samplePrecision><lengthPerEncoder>1024</lengthPerEncoder>" +
      "<soundTrack>mono</soundTrack></audioConfig></audioConfigList>" +
      "</TalkAbility>",
  ).root;

  assertEquals(talkAbility.decode(root), {
    duplexList: ["FDX", "HDX"],
    audioStreamModeList: ["followVideoStream"],
    audioConfigList: [{
      priority: 0,
      audioType: "adpcm",
      sampleRate: 16000,
      samplePrecision: 16,
      lengthPerEncoder: 1024,
      soundTrack: "mono",
    }],
  });
});

Deno.test("talkAbility round-trips through encode and decode", () => {
  const value = {
    duplexList: ["HDX" as const],
    audioStreamModeList: ["onlyAudioStream" as const],
    audioConfigList: [{
      priority: 1,
      audioType: "g711" as const,
      sampleRate: 8000,
      samplePrecision: 8,
      lengthPerEncoder: 320,
      soundTrack: "stereo" as const,
    }],
  };

  assertEquals(
    talkAbility.decode(parse(talkAbility.encode(value)).root),
    value,
  );
});

Deno.test("talkAbility reads a reply without audioConfigList", () => {
  const root = parse(
    "<TalkAbility><duplexList></duplexList><audioStreamModeList>" +
      "</audioStreamModeList></TalkAbility>",
  ).root;

  assertEquals(talkAbility.decode(root), {
    duplexList: [],
    audioStreamModeList: [],
  });
});

Deno.test("talkAbility throws without duplexList, which the camera always writes", () => {
  const root = parse(
    "<TalkAbility><audioStreamModeList></audioStreamModeList></TalkAbility>",
  ).root;

  assertThrows(() => talkAbility.decode(root), Error, "<duplexList>");
});

Deno.test("talkAbility reads the Video Doorbell PoE's mixAudioStream mode", () => {
  const root = parse(
    '<TalkAbility version="1.1">' +
      "<duplexList><duplex>FDX</duplex></duplexList>" +
      "<audioStreamModeList><audioStreamMode>mixAudioStream</audioStreamMode>" +
      "</audioStreamModeList></TalkAbility>",
  ).root;

  assertEquals(talkAbility.decode(root).audioStreamModeList, [
    "mixAudioStream",
  ]);
});
