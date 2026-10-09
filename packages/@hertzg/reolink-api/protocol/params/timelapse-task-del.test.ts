import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { timelapseTaskDel } from "./timelapse-task-del.ts";

Deno.test("timelapseTaskDel decodes the reply the camera writes", () => {
  const root = parse(
    '<timelapseTaskDel version="1.1"><uid>uid-abc123</uid>' +
      "<id>task-abc123</id></timelapseTaskDel>",
  ).root;

  assertEquals(timelapseTaskDel.decode(root), {
    uid: "uid-abc123",
    id: "task-abc123",
  });
});

Deno.test("timelapseTaskDel round-trips through encode and decode", () => {
  const value = { uid: "uid-def456", id: "task-def456" };

  const xml = timelapseTaskDel.encode(value);

  assertEquals(timelapseTaskDel.decode(parse(xml).root), value);
});

Deno.test("timelapseTaskDel decodes a request without a uid", () => {
  const root = parse(
    '<timelapseTaskDel version="1.1"><id>task-ghi789</id></timelapseTaskDel>',
  ).root;

  assertEquals(timelapseTaskDel.decode(root), { id: "task-ghi789" });
});
