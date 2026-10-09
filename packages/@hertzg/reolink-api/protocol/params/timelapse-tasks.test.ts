import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { timelapseTasks } from "./timelapse-tasks.ts";

Deno.test("timelapseTasks decodes what net_timelapse_task_s2x writes", () => {
  const root = parse(
    '<timelapseTasks version="1.1"><channelId>0</channelId><uid>disk-uid-1</uid>' +
      "<item><id>task-one</id><properties>props-one</properties>" +
      "<taskType>mp4</taskType><taskState>IDLE</taskState></item>" +
      "<item><id>task-two</id><properties>props-two</properties>" +
      "<taskType>jpeg</taskType><taskState>DELETING</taskState></item>" +
      "</timelapseTasks>",
  ).root;

  assertEquals(timelapseTasks.decode(root), {
    channelId: 0,
    uid: "disk-uid-1",
    item: [
      {
        id: "task-one",
        properties: "props-one",
        taskType: "mp4",
        taskState: "IDLE",
      },
      {
        id: "task-two",
        properties: "props-two",
        taskType: "jpeg",
        taskState: "DELETING",
      },
    ],
  });
});

Deno.test("timelapseTasks round-trips every field", () => {
  const value = {
    channelId: 1,
    uid: "disk-uid-2",
    item: [{
      id: "task-three",
      properties: "props-three",
      taskType: "jpeg" as const,
      taskState: "RUNNING" as const,
    }],
  };

  assertEquals(
    timelapseTasks.decode(parse(timelapseTasks.encode(value)).root),
    value,
  );
});

Deno.test("timelapseTasks reads a reply without tasks as no items", () => {
  const root = parse(
    '<timelapseTasks version="1.1"><channelId>0</channelId><uid>u</uid></timelapseTasks>',
  ).root;

  assertEquals(timelapseTasks.decode(root).item, undefined);
});

Deno.test("timelapseTasks throws on a taskState the firmware does not write", () => {
  const root = parse(
    '<timelapseTasks version="1.1"><item><taskState>PAUSED</taskState></item>' +
      "</timelapseTasks>",
  ).root;

  assertThrows(() => timelapseTasks.decode(root), Error, "PAUSED");
});
