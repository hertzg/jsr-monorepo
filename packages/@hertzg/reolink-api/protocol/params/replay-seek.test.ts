import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { replaySeek } from "./replay-seek.ts";

Deno.test("replaySeek decodes a full cmd 123 request", () => {
  const root = parse(
    '<ReplaySeek version="1.1"><channelId>2</channelId><seekTime>' +
      "<year>2026</year><month>10</month><day>9</day><hour>14</hour>" +
      "<minute>30</minute><second>15</second></seekTime><seq>7</seq></ReplaySeek>",
  ).root;

  assertEquals(replaySeek.decode(root), {
    channelId: 2,
    seekTime: {
      year: 2026,
      month: 10,
      day: 9,
      hour: 14,
      minute: 30,
      second: 15,
    },
    seq: 7,
  });
});

Deno.test("replaySeek decodes an empty element", () => {
  const root = parse('<ReplaySeek version="1.1"></ReplaySeek>').root;

  assertEquals(replaySeek.decode(root), {});
});

Deno.test("replaySeek round-trips through encode and decode", () => {
  const value = {
    channelId: 3,
    seekTime: {
      year: 2025,
      month: 1,
      day: 31,
      hour: 23,
      minute: 59,
      second: 58,
    },
    seq: 12,
  };

  const xml = replaySeek.encode(value);

  assertEquals(replaySeek.decode(parse(xml).root), value);
});
