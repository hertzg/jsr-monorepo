import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { findAlarmVideo } from "./find-alarm-video.ts";

Deno.test("findAlarmVideo decodes the cmd 272 reply netserver writes", () => {
  const root = parse(
    '<findAlarmVideo version="1.1"><channelId>0</channelId>' +
      "<fileHandle>7</fileHandle></findAlarmVideo>",
  ).root;

  assertEquals(findAlarmVideo.decode(root), { channelId: 0, fileHandle: 7 });
});

Deno.test("findAlarmVideo decodes a cmd 272 request", () => {
  const root = parse(
    "<findAlarmVideo><channelId>1</channelId><streamType>2</streamType>" +
      "<startTime><year>2026</year><month>3</month><day>4</day>" +
      "<hour>5</hour><minute>6</minute><second>7</second></startTime>" +
      "<endTime><year>2027</year><month>8</month><day>9</day>" +
      "<hour>10</hour><minute>11</minute><second>12</second></endTime>" +
      "<alarmType>md,people,visitor</alarmType></findAlarmVideo>",
  ).root;

  assertEquals(findAlarmVideo.decode(root), {
    channelId: 1,
    streamType: 2,
    startTime: { year: 2026, month: 3, day: 4, hour: 5, minute: 6, second: 7 },
    endTime: {
      year: 2027,
      month: 8,
      day: 9,
      hour: 10,
      minute: 11,
      second: 12,
    },
    alarmType: "md,people,visitor",
  });
});

Deno.test("findAlarmVideo round-trips through encode and decode", () => {
  const value = {
    channelId: 3,
    fileHandle: 21,
    streamType: 1,
    startTime: { year: 2025, month: 1, day: 2, hour: 3, minute: 4, second: 5 },
    endTime: { year: 2025, month: 6, day: 7, hour: 8, minute: 9, second: 10 },
    alarmType: "package",
  };

  assertEquals(
    findAlarmVideo.decode(parse(findAlarmVideo.encode(value)).root),
    value,
  );
});

Deno.test("findAlarmVideo encodes a cmd 274 stop with only the handle", () => {
  assertEquals(
    findAlarmVideo.encode({ fileHandle: 9 }),
    '<findAlarmVideo version="1.1"><fileHandle>9</fileHandle></findAlarmVideo>',
  );
});
