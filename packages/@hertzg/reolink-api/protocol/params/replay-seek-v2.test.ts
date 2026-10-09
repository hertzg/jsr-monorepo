import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { replaySeekV2 } from "./replay-seek-v2.ts";

Deno.test("replaySeekV2 decodes every field nets_param_new_replay_seek_x2s reads", () => {
  const root = parse(
    '<ReplaySeekV2 version="1.1"><seekTime><year>2026</year>' +
      "<month>10</month><day>9</day><hour>14</hour><minute>30</minute>" +
      "<second>15</second></seekTime><seq>5</seq>" +
      "<durationList><year>2027</year><month>11</month><day>10</day>" +
      "<duration><channelId>0</channelId><times>" +
      "<i><s>3600</s><e>7200</e></i></times></duration>" +
      "</durationList></ReplaySeekV2>",
  ).root;

  assertEquals(replaySeekV2.decode(root), {
    seekTime: {
      year: 2026,
      month: 10,
      day: 9,
      hour: 14,
      minute: 30,
      second: 15,
    },
    seq: 5,
    durationList: {
      year: 2027,
      month: 11,
      day: 10,
      duration: [{ channelId: 0, times: [{ s: 3600, e: 7200 }] }],
    },
  });
});

Deno.test("replaySeekV2 decodes a duration list with no durations as empty", () => {
  const root = parse(
    "<ReplaySeekV2><durationList><year>2026</year></durationList></ReplaySeekV2>",
  ).root;

  assertEquals(replaySeekV2.decode(root).durationList, {
    year: 2026,
    duration: [],
  });
});

Deno.test("replaySeekV2 round-trips through encode and decode", () => {
  const value = {
    seekTime: { year: 2025, month: 1, day: 2, hour: 3, minute: 4, second: 5 },
    seq: 8,
    durationList: {
      year: 2025,
      month: 1,
      day: 2,
      duration: [
        { channelId: 1, times: [{ s: 10, e: 20 }, { s: 30, e: 40 }] },
      ],
    },
  };

  const xml = replaySeekV2.encode(value);

  assertEquals(replaySeekV2.decode(parse(xml).root), value);
});
