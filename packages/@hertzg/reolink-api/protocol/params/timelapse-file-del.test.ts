import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { timelapseFileDel } from "./timelapse-file-del.ts";

Deno.test("timelapseFileDel decodes the reply the camera writes", () => {
  const root = parse(
    '<timelapseFileDel version="1.1"><item><id>file-abc123</id></item>' +
      "<item><id>file-def456</id></item></timelapseFileDel>",
  ).root;

  assertEquals(timelapseFileDel.decode(root), {
    item: [{ id: "file-abc123" }, { id: "file-def456" }],
  });
});

Deno.test("timelapseFileDel round-trips through encode and decode", () => {
  const value = {
    taskType: "mp4" as const,
    item: [{ id: "file-ghi789" }, { id: "file-jkl012" }],
  };

  const xml = timelapseFileDel.encode(value);

  assertEquals(timelapseFileDel.decode(parse(xml).root), value);
});

Deno.test("timelapseFileDel decodes no items as an empty list", () => {
  const root = parse('<timelapseFileDel version="1.1"></timelapseFileDel>')
    .root;

  assertEquals(timelapseFileDel.decode(root).item, []);
});

Deno.test("timelapseFileDel rejects a media type the firmware does not map", () => {
  const root = parse(
    '<timelapseFileDel version="1.1"><taskType>avi</taskType></timelapseFileDel>',
  ).root;

  assertThrows(() => timelapseFileDel.decode(root), Error, "taskType");
});
