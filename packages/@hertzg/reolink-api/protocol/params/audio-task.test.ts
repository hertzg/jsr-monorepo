import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { audioTask } from "./audio-task.ts";

Deno.test("audioTask decodes the reply nets_audio_task_s2x writes", () => {
  const motionHours = "1".repeat(24) + "0".repeat(144);
  const peopleHours = "0".repeat(168);
  const root = parse(
    '<AudioTask version="1.1"><channelId>1</channelId><enable>1</enable>' +
      "<typeScheduleList>" +
      `<item><type>MD</type><valueTable>${motionHours}</valueTable></item>` +
      `<item><type>people</type><valueTable>${peopleHours}</valueTable></item>` +
      "</typeScheduleList></AudioTask>",
  ).root;

  assertEquals(audioTask.decode(root), {
    channelId: 1,
    enable: 1,
    typeScheduleList: [
      { type: "MD", valueTable: motionHours },
      { type: "people", valueTable: peopleHours },
    ],
  });
});

Deno.test("audioTask round-trips a full value", () => {
  const value = {
    channelId: 0,
    enable: 0,
    typeScheduleList: [{ type: "IO", valueTable: "01".repeat(84) }],
  };

  assertEquals(audioTask.decode(parse(audioTask.encode(value)).root), value);
});

Deno.test("audioTask decodes a request that carries only the channel", () => {
  const root = parse(
    '<AudioTask version="1.1"><channelId>2</channelId></AudioTask>',
  ).root;

  assertEquals(audioTask.decode(root), { channelId: 2 });
});
