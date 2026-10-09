import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { audioEncodeAbility } from "./audio-encode-ability.ts";

Deno.test("audioEncodeAbility decodes the reply nets_audio_encode_ability_s2x writes", () => {
  const root = parse(
    '<AudioEncodeAbility version="1.1"><channelId>0</channelId>' +
      "<maxCapacity>2</maxCapacity><audioEncodeList>" +
      "<audioEncode><audioType>adpcm</audioType><sampleRate>16000</sampleRate>" +
      "<samplePrecision>16</samplePrecision><lengthPerEncoder>1024</lengthPerEncoder>" +
      "<soundTrack>mono</soundTrack></audioEncode>" +
      "<audioEncode><audioType>g711</audioType><sampleRate>8000</sampleRate>" +
      "<samplePrecision>8</samplePrecision><lengthPerEncoder>320</lengthPerEncoder>" +
      "<soundTrack>stereo</soundTrack></audioEncode>" +
      "</audioEncodeList></AudioEncodeAbility>",
  ).root;

  assertEquals(audioEncodeAbility.decode(root), {
    channelId: 0,
    maxCapacity: 2,
    audioEncodeList: [
      {
        audioType: "adpcm",
        sampleRate: 16000,
        samplePrecision: 16,
        lengthPerEncoder: 1024,
        soundTrack: "mono",
      },
      {
        audioType: "g711",
        sampleRate: 8000,
        samplePrecision: 8,
        lengthPerEncoder: 320,
        soundTrack: "stereo",
      },
    ],
  });
});

Deno.test("audioEncodeAbility round-trips a full value", () => {
  const value = {
    channelId: 1,
    maxCapacity: 3,
    audioEncodeList: [{
      audioType: "g711" as const,
      sampleRate: 44100,
      samplePrecision: 24,
      lengthPerEncoder: 512,
      soundTrack: "mono" as const,
    }],
  };

  assertEquals(
    audioEncodeAbility.decode(parse(audioEncodeAbility.encode(value)).root),
    value,
  );
});

Deno.test("audioEncodeAbility decodes a reply with no encoding enabled", () => {
  const root = parse(
    '<AudioEncodeAbility version="1.1"><channelId>0</channelId>' +
      "<maxCapacity>0</maxCapacity></AudioEncodeAbility>",
  ).root;

  assertEquals(audioEncodeAbility.decode(root), {
    channelId: 0,
    maxCapacity: 0,
  });
});

Deno.test("audioEncodeAbility rejects an audio type the firmware never writes", () => {
  const root = parse(
    '<AudioEncodeAbility version="1.1"><audioEncodeList><audioEncode>' +
      "<audioType>aac</audioType><sampleRate>16000</sampleRate>" +
      "<samplePrecision>16</samplePrecision><lengthPerEncoder>1024</lengthPerEncoder>" +
      "<soundTrack>mono</soundTrack></audioEncode></audioEncodeList></AudioEncodeAbility>",
  ).root;

  assertThrows(() => audioEncodeAbility.decode(root), Error, "aac");
});
