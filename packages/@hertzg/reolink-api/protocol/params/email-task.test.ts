import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { emailTask } from "./email-task.ts";

Deno.test("emailTask decodes the reply nets_email_task_s2x writes", () => {
  const motionHours = "0".repeat(144) + "1".repeat(24);
  const peopleHours = "1".repeat(168);
  const root = parse(
    '<EmailTask version="1.1"><channelId>2</channelId><enable>1</enable>' +
      "<typeScheduleList>" +
      `<item><type>MD</type><valueTable>${motionHours}</valueTable></item>` +
      `<item><type>people</type><valueTable>${peopleHours}</valueTable></item>` +
      "</typeScheduleList></EmailTask>",
  ).root;

  assertEquals(emailTask.decode(root), {
    channelId: 2,
    enable: 1,
    typeScheduleList: [
      { type: "MD", valueTable: motionHours },
      { type: "people", valueTable: peopleHours },
    ],
  });
});

Deno.test("emailTask round-trips a full value", () => {
  const value = {
    channelId: 1,
    enable: 0,
    typeScheduleList: [
      { type: "MD,people", valueTable: "01".repeat(84) },
      { type: "vehicle", valueTable: "0".repeat(168) },
    ],
  };

  assertEquals(emailTask.decode(parse(emailTask.encode(value)).root), value);
});

Deno.test("emailTask decodes a request that carries only the channel", () => {
  const root = parse(
    '<EmailTask version="1.1"><channelId>0</channelId></EmailTask>',
  ).root;

  assertEquals(emailTask.decode(root), { channelId: 0 });
});

Deno.test("emailTask writes an empty typeScheduleList as an empty wrapper", () => {
  assertEquals(
    emailTask.encode({ channelId: 0, enable: 1, typeScheduleList: [] }),
    '<EmailTask version="1.1"><channelId>0</channelId><enable>1</enable>' +
      "<typeScheduleList></typeScheduleList></EmailTask>",
  );
});
