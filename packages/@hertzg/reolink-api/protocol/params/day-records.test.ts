import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dayRecords } from "./day-records.ts";

Deno.test("dayRecords decodes a cmd 142 reply with two channels", () => {
  const root = parse(
    '<DayRecords version="1.1">' +
      "<startTime><year>2026</year><month>10</month><day>1</day>" +
      "<hour>0</hour><minute>0</minute><second>0</second></startTime>" +
      "<endTime><year>2026</year><month>10</month><day>31</day>" +
      "<hour>23</hour><minute>59</minute><second>58</second></endTime>" +
      "<DayRecordList>" +
      "<DayRecord><index>0</index><channelId>0</channelId><dayTypeList>" +
      "<dayType><index>3</index><type>normal</type></dayType>" +
      "<dayType><index>8</index><type>alarm</type></dayType>" +
      "</dayTypeList></DayRecord>" +
      "<DayRecord><index>1</index><channelId>2</channelId><dayTypeList>" +
      "<dayType><index>14</index><type>all</type></dayType>" +
      "</dayTypeList></DayRecord>" +
      "</DayRecordList></DayRecords>",
  ).root;

  assertEquals(dayRecords.decode(root), {
    startTime: { year: 2026, month: 10, day: 1, hour: 0, minute: 0, second: 0 },
    endTime: {
      year: 2026,
      month: 10,
      day: 31,
      hour: 23,
      minute: 59,
      second: 58,
    },
    DayRecordList: [
      {
        index: 0,
        channelId: 0,
        dayTypeList: [
          { index: 3, type: "normal" },
          { index: 8, type: "alarm" },
        ],
      },
      {
        index: 1,
        channelId: 2,
        dayTypeList: [{ index: 14, type: "all" }],
      },
    ],
  });
});

Deno.test("dayRecords decodes a channel with no recorded days", () => {
  const root = parse(
    '<DayRecords version="1.1"><DayRecordList><DayRecord><index>0</index>' +
      "<channelId>1</channelId><dayTypeList></dayTypeList></DayRecord>" +
      "</DayRecordList></DayRecords>",
  ).root;

  assertEquals(dayRecords.decode(root).DayRecordList, [
    { index: 0, channelId: 1, dayTypeList: [] },
  ]);
});

Deno.test("dayRecords rejects a day without a type", () => {
  const root = parse(
    '<DayRecords version="1.1"><DayRecordList><DayRecord><dayTypeList>' +
      "<dayType><index>5</index></dayType></dayTypeList></DayRecord>" +
      "</DayRecordList></DayRecords>",
  ).root;

  assertThrows(() => dayRecords.decode(root), Error, "<type>");
});

Deno.test("dayRecords rejects an unknown day type", () => {
  const root = parse(
    '<DayRecords version="1.1"><DayRecordList><DayRecord><dayTypeList>' +
      "<dayType><index>5</index><type>motion</type></dayType></dayTypeList>" +
      "</DayRecord></DayRecordList></DayRecords>",
  ).root;

  assertThrows(() => dayRecords.decode(root), Error, "expected one of");
});

Deno.test("dayRecords round-trips through encode and decode", () => {
  const value = {
    startTime: { year: 2025, month: 2, day: 3, hour: 4, minute: 5, second: 6 },
    endTime: { year: 2025, month: 7, day: 8, hour: 9, minute: 10, second: 11 },
    DayRecordList: [{
      index: 0,
      channelId: 3,
      dayTypeList: [{ index: 30, type: "none" as const }],
    }],
  };

  const xml = dayRecords.encode(value);

  assertEquals(dayRecords.decode(parse(xml).root), value);
});
