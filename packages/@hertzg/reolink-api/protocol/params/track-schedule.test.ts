import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { trackSchedule } from "./track-schedule.ts";

Deno.test("trackSchedule decodes the reply the camera writes", () => {
  const root = parse(
    '<trackSchedule version="1.1"><channelId>2</channelId>' +
      "<timeTable>table-abc123</timeTable></trackSchedule>",
  ).root;

  assertEquals(trackSchedule.decode(root), {
    channelId: 2,
    timeTable: "table-abc123",
  });
});

Deno.test("trackSchedule round-trips through encode and decode", () => {
  const value = { channelId: 0, timeTable: "110".repeat(56) };

  const xml = trackSchedule.encode(value);

  assertEquals(trackSchedule.decode(parse(xml).root), value);
});

Deno.test("trackSchedule decodes a request without a channel", () => {
  const root = parse(
    '<trackSchedule version="1.1"><timeTable>table-def456</timeTable></trackSchedule>',
  ).root;

  assertEquals(trackSchedule.decode(root), { timeTable: "table-def456" });
});
