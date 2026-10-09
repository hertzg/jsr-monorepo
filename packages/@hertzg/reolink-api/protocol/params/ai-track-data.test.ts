import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { aiTrackData } from "./ai-track-data.ts";

Deno.test("aiTrackData decodes a cmd 362 reply", () => {
  const root = parse(
    '<AiTrackData version="1.1"><fileName>track_20261009.dat</fileName>' +
      "<size>4096</size></AiTrackData>",
  ).root;

  assertEquals(aiTrackData.decode(root), {
    fileName: "track_20261009.dat",
    size: 4096,
  });
});

Deno.test("aiTrackData decodes a cmd 362 request date", () => {
  const root = parse(
    "<AiTrackData><year>2026</year><month>10</month><day>9</day></AiTrackData>",
  ).root;

  assertEquals(aiTrackData.decode(root), { year: 2026, month: 10, day: 9 });
});

Deno.test("aiTrackData round-trips through encode and decode", () => {
  const value = {
    fileName: "track_20250102.dat",
    size: 512,
    year: 2025,
    month: 1,
    day: 2,
  };

  const xml = aiTrackData.encode(value);

  assertEquals(aiTrackData.decode(parse(xml).root), value);
});
