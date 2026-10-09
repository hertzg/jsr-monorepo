import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { timelapseCover } from "./timelapse-cover.ts";

Deno.test("timelapseCover decodes what net_timelapse_file_cover_s2x writes", () => {
  const root = parse(
    '<timelapseCover version="1.1"><id>file-abc</id></timelapseCover>',
  ).root;

  assertEquals(timelapseCover.decode(root), { id: "file-abc" });
});

Deno.test("timelapseCover round-trips an id with XML characters", () => {
  const value = { id: "dir/a&b<1>.jpg" };

  assertEquals(
    timelapseCover.decode(parse(timelapseCover.encode(value)).root),
    value,
  );
});
