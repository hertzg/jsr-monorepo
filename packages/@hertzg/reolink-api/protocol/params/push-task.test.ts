import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { pushTask } from "./push-task.ts";

Deno.test("pushTask decodes the reply nets_push_task_s2x writes", () => {
  const motionHours = "0".repeat(144) + "1".repeat(24);
  const vehicleHours = "1".repeat(168);
  const root = parse(
    '<PushTask version="1.1"><channelId>3</channelId><enable>1</enable>' +
      "<typeScheduleList>" +
      `<item><type>MD</type><valueTable>${motionHours}</valueTable></item>` +
      `<item><type>vehicle</type><valueTable>${vehicleHours}</valueTable></item>` +
      "</typeScheduleList></PushTask>",
  ).root;

  assertEquals(pushTask.decode(root), {
    channelId: 3,
    enable: 1,
    typeScheduleList: [
      { type: "MD", valueTable: motionHours },
      { type: "vehicle", valueTable: vehicleHours },
    ],
  });
});

Deno.test("pushTask round-trips a full value", () => {
  const value = {
    channelId: 1,
    enable: 0,
    typeScheduleList: [{ type: "dog_cat", valueTable: "10".repeat(84) }],
  };

  assertEquals(pushTask.decode(parse(pushTask.encode(value)).root), value);
});

Deno.test("pushTask decodes a request that carries only the channel", () => {
  const root = parse(
    '<PushTask version="1.1"><channelId>0</channelId></PushTask>',
  ).root;

  assertEquals(pushTask.decode(root), { channelId: 0 });
});
