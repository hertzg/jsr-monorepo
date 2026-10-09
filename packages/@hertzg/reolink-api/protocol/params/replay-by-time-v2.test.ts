import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { replayByTimeV2 } from "./replay-by-time-v2.ts";

Deno.test("replayByTimeV2 decodes every field nets_param_new_replay_start_x2s reads", () => {
  const root = parse(
    '<ReplayByTimeV2 version="1.1"><seq>4</seq>' +
      "<streamType>subStream</streamType><playSpeed>2</playSpeed>" +
      "<startTime><year>2026</year><month>10</month><day>9</day>" +
      "<hour>8</hour><minute>15</minute><second>30</second></startTime>" +
      "<endTime><year>2027</year><month>11</month><day>10</day>" +
      "<hour>9</hour><minute>16</minute><second>31</second></endTime>" +
      "<durationList><year>2028</year><month>12</month><day>11</day>" +
      "<duration><channelId>0</channelId><times>" +
      "<i><s>100</s><e>200</e></i><i><s>300</s><e>400</e></i>" +
      "</times></duration>" +
      "<duration><channelId>1</channelId><times>" +
      "<i><s>500</s><e>600</e></i></times></duration>" +
      "</durationList></ReplayByTimeV2>",
  ).root;

  assertEquals(replayByTimeV2.decode(root), {
    seq: 4,
    streamType: "subStream",
    playSpeed: 2,
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
    durationList: {
      year: 2028,
      month: 12,
      day: 11,
      duration: [
        { channelId: 0, times: [{ s: 100, e: 200 }, { s: 300, e: 400 }] },
        { channelId: 1, times: [{ s: 500, e: 600 }] },
      ],
    },
  });
});

Deno.test("replayByTimeV2 decodes a cmd 382 stop request with only a sequence number", () => {
  const root = parse(
    '<ReplayByTimeV2 version="1.1"><seq>9</seq></ReplayByTimeV2>',
  ).root;

  assertEquals(replayByTimeV2.decode(root), { seq: 9 });
});

Deno.test("replayByTimeV2 rejects a stream type outside the four names", () => {
  const root = parse(
    "<ReplayByTimeV2><streamType>thirdStream</streamType></ReplayByTimeV2>",
  ).root;

  assertThrows(() => replayByTimeV2.decode(root), Error, '"thirdStream"');
});

Deno.test("replayByTimeV2 round-trips through encode and decode", () => {
  const value = {
    seq: 1,
    streamType: "externStream" as const,
    playSpeed: 32,
    startTime: { year: 2025, month: 1, day: 2, hour: 3, minute: 4, second: 5 },
    endTime: { year: 2025, month: 6, day: 7, hour: 8, minute: 9, second: 10 },
    durationList: {
      year: 2025,
      month: 3,
      day: 4,
      duration: [{ channelId: 2, times: [{ s: 60, e: 120 }] }],
    },
  };

  const xml = replayByTimeV2.encode(value);

  assertEquals(replayByTimeV2.decode(parse(xml).root), value);
});
