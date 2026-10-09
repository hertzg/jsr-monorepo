import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { audioPlayInfo } from "./audio-play-info.ts";

Deno.test("audioPlayInfo decodes every field nets_param_manul_play_x2s reads", () => {
  const root = parse(
    '<audioPlayInfo version="1.1"><channelId>1</channelId><playMode>2</playMode>' +
      "<playDuration>15</playDuration><playTimes>3</playTimes><onOff>1</onOff>" +
      "</audioPlayInfo>",
  ).root;

  assertEquals(audioPlayInfo.decode(root), {
    channelId: 1,
    playMode: 2,
    playDuration: 15,
    playTimes: 3,
    onOff: 1,
  });
});

Deno.test("audioPlayInfo round-trips a full value", () => {
  const value = {
    channelId: 0,
    playMode: 1,
    playDuration: 20,
    playTimes: 4,
    onOff: 0,
  };

  assertEquals(
    audioPlayInfo.decode(parse(audioPlayInfo.encode(value)).root),
    value,
  );
});

Deno.test("audioPlayInfo omits fields that are not set", () => {
  assertEquals(
    audioPlayInfo.encode({ channelId: 0, onOff: 0 }),
    '<audioPlayInfo version="1.1"><channelId>0</channelId><onOff>0</onOff></audioPlayInfo>',
  );
});
