import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { muteAudio } from "./mute-audio.ts";

test("muteAudio decodes both fields nets_param_mute_audio_x2s reads", () => {
  const root = parse(
    '<muteAudio version="1.1"><channelId>2</channelId><mute>1</mute></muteAudio>',
  ).root;

  assertEquals(muteAudio.decode(root), { channelId: 2, mute: 1 });
});

test("muteAudio round-trips a full value", () => {
  const value = { channelId: 1, mute: 0 };

  assertEquals(muteAudio.decode(parse(muteAudio.encode(value)).root), value);
});

test("muteAudio decodes a request that carries only the channel", () => {
  const root = parse(
    '<muteAudio version="1.1"><channelId>0</channelId></muteAudio>',
  ).root;

  assertEquals(muteAudio.decode(root), { channelId: 0 });
});
