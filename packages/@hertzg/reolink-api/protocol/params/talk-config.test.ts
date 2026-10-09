import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { talkConfig } from "./talk-config.ts";

Deno.test("talkConfig decodes a full cmd 201 request", () => {
  const root = parse(
    '<TalkConfig version="1.1"><duplex>FDX</duplex>' +
      "<audioStreamMode>onlyAudioStream</audioStreamMode><audioConfig>" +
      "<priority>3</priority><audioType>g711</audioType>" +
      "<sampleRate>8000</sampleRate><samplePrecision>16</samplePrecision>" +
      "<lengthPerEncoder>640</lengthPerEncoder><soundTrack>stereo</soundTrack>" +
      "</audioConfig></TalkConfig>",
  ).root;

  assertEquals(talkConfig.decode(root), {
    duplex: "FDX",
    audioStreamMode: "onlyAudioStream",
    audioConfig: {
      priority: 3,
      audioType: "g711",
      sampleRate: 8000,
      samplePrecision: 16,
      lengthPerEncoder: 640,
      soundTrack: "stereo",
    },
  });
});

Deno.test("talkConfig decodes an empty element", () => {
  const root = parse('<TalkConfig version="1.1"></TalkConfig>').root;

  assertEquals(talkConfig.decode(root), {});
});

Deno.test("talkConfig rejects an audio config without a sound track", () => {
  const root = parse(
    '<TalkConfig version="1.1"><audioConfig><audioType>adpcm</audioType>' +
      "<sampleRate>16000</sampleRate><samplePrecision>16</samplePrecision>" +
      "<lengthPerEncoder>1024</lengthPerEncoder></audioConfig></TalkConfig>",
  ).root;

  assertThrows(() => talkConfig.decode(root), Error, "<soundTrack>");
});

Deno.test("talkConfig rejects an unknown audio codec", () => {
  const root = parse(
    '<TalkConfig version="1.1"><audioConfig><audioType>aac</audioType>' +
      "<sampleRate>16000</sampleRate><samplePrecision>16</samplePrecision>" +
      "<lengthPerEncoder>1024</lengthPerEncoder><soundTrack>mono</soundTrack>" +
      "</audioConfig></TalkConfig>",
  ).root;

  assertThrows(() => talkConfig.decode(root), Error, "<audioType>");
});

Deno.test("talkConfig round-trips through encode and decode", () => {
  const value = {
    duplex: "HDX" as const,
    audioStreamMode: "followVideoStream" as const,
    audioConfig: {
      priority: 0,
      audioType: "adpcm" as const,
      sampleRate: 16000,
      samplePrecision: 16,
      lengthPerEncoder: 1024,
      soundTrack: "mono" as const,
    },
  };

  const xml = talkConfig.encode(value);

  assertEquals(talkConfig.decode(parse(xml).root), value);
});
