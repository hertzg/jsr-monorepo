import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { cloudTask } from "./cloud-task.ts";

Deno.test("cloudTask decodes the reply cgi_cloud_task_s2x writes", () => {
  const motionHours = "0".repeat(24) + "1".repeat(144);
  const faceHours = "1".repeat(168);
  const root = parse(
    '<CloudTask version="1.1"><channelId>4</channelId><enable>1</enable>' +
      "<typeScheduleList>" +
      `<item><type>MD</type><valueTable>${motionHours}</valueTable></item>` +
      `<item><type>face</type><valueTable>${faceHours}</valueTable></item>` +
      "</typeScheduleList></CloudTask>",
  ).root;

  assertEquals(cloudTask.decode(root), {
    channelId: 4,
    enable: 1,
    typeScheduleList: [
      { type: "MD", valueTable: motionHours },
      { type: "face", valueTable: faceHours },
    ],
  });
});

Deno.test("cloudTask round-trips a full value", () => {
  const value = {
    channelId: 0,
    enable: 1,
    typeScheduleList: [{ type: "other", valueTable: "0".repeat(168) }],
  };

  assertEquals(cloudTask.decode(parse(cloudTask.encode(value)).root), value);
});

Deno.test("cloudTask decodes a request that carries only the channel", () => {
  const root = parse(
    '<CloudTask version="1.1"><channelId>0</channelId></CloudTask>',
  ).root;

  assertEquals(cloudTask.decode(root), { channelId: 0 });
});
