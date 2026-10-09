import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { coverPreview } from "./cover-preview.ts";

Deno.test("coverPreview decodes every field net_cover_preview_x2s reads", () => {
  const root = parse(
    '<CoverPreview version="1.1"><channelId>0</channelId>' +
      "<streamType>subStream</streamType>" +
      "<startTime><year>2026</year><month>10</month><day>9</day>" +
      "<hour>8</hour><minute>15</minute><second>30</second></startTime>" +
      "<endTime><year>2027</year><month>11</month><day>10</day>" +
      "<hour>9</hour><minute>16</minute><second>31</second></endTime>" +
      "<frameList><frameNo>1</frameNo><frameNo>5</frameNo></frameList>" +
      "</CoverPreview>",
  ).root;

  assertEquals(coverPreview.decode(root), {
    channelId: 0,
    streamType: "subStream",
    startTime: {
      year: 2026,
      month: 10,
      day: 9,
      hour: 8,
      minute: 15,
      second: 30,
    },
    endTime: {
      year: 2027,
      month: 11,
      day: 10,
      hour: 9,
      minute: 16,
      second: 31,
    },
    frameList: [1, 5],
  });
});

Deno.test("coverPreview round-trips every field", () => {
  const value = {
    channelId: 2,
    streamType: "externStream" as const,
    startTime: { year: 2025, month: 1, day: 2, hour: 3, minute: 4, second: 5 },
    endTime: { year: 2025, month: 6, day: 7, hour: 8, minute: 9, second: 10 },
    frameList: [0, 10, 20],
  };

  assertEquals(
    coverPreview.decode(parse(coverPreview.encode(value)).root),
    value,
  );
});

Deno.test("coverPreview reads an empty frameList as no frames", () => {
  const root = parse(
    '<CoverPreview version="1.1"><frameList></frameList></CoverPreview>',
  ).root;

  assertEquals(coverPreview.decode(root).frameList, []);
});
