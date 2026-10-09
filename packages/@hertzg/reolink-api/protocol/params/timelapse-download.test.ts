import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { timelapseDownload } from "./timelapse-download.ts";

Deno.test("timelapseDownload decodes the reply the camera writes", () => {
  const root = parse(
    '<timelapseDownload version="1.1"><position>1048576</position>' +
      "<id>task-abc123</id><taskType>jpeg</taskType></timelapseDownload>",
  ).root;

  assertEquals(timelapseDownload.decode(root), {
    position: 1048576n,
    id: "task-abc123",
    taskType: "jpeg",
  });
});

Deno.test("timelapseDownload round-trips through encode and decode", () => {
  const value = {
    position: 18446744073709551615n,
    id: "task-def456",
    taskType: "mp4" as const,
  };

  const xml = timelapseDownload.encode(value);

  assertEquals(timelapseDownload.decode(parse(xml).root), value);
});

Deno.test("timelapseDownload decodes a request that names only the task", () => {
  const root = parse(
    '<timelapseDownload version="1.1"><id>task-ghi789</id></timelapseDownload>',
  ).root;

  assertEquals(timelapseDownload.decode(root), { id: "task-ghi789" });
});

Deno.test("timelapseDownload rejects a media type the firmware does not map", () => {
  const root = parse(
    '<timelapseDownload version="1.1"><taskType>gif</taskType></timelapseDownload>',
  ).root;

  assertThrows(() => timelapseDownload.decode(root), Error, "taskType");
});
