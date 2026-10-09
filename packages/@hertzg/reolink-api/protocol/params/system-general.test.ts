import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { systemGeneral } from "./system-general.ts";

Deno.test("systemGeneral decodes the element the firmware writes", () => {
  const root = parse(
    '<SystemGeneral version="1.1"><timeZone>-14400</timeZone><osdFormat>DMY</osdFormat>' +
      "<year>2026</year><month>10</month><day>9</day><hour>13</hour><minute>14</minute>" +
      "<second>15</second><deviceId>7</deviceId><timeFormat>1</timeFormat>" +
      "<language>English</language><deviceName>Front door</deviceName>" +
      "<loginLock>1</loginLock><lockTime>300</lockTime><allowedTimes>5</allowedTimes>" +
      "<isDst>0</isDst></SystemGeneral>",
  ).root;

  assertEquals(systemGeneral.decode(root), {
    timeZone: -14400,
    osdFormat: "DMY",
    year: 2026,
    month: 10,
    day: 9,
    hour: 13,
    minute: 14,
    second: 15,
    deviceId: 7,
    timeFormat: 1,
    language: "English",
    deviceName: "Front door",
    loginLock: 1,
    lockTime: 300,
    allowedTimes: 5,
    isDst: 0,
  });
});

Deno.test("systemGeneral round-trips through encode and decode", () => {
  const value = {
    timeZone: 3600,
    osdFormat: "YMD_CN" as const,
    year: 2025,
    month: 1,
    day: 2,
    hour: 3,
    minute: 4,
    second: 5,
    deviceId: 6,
    timeFormat: 0,
    language: "Polish",
    deviceName: "Garage & shed",
    loginLock: 0,
    lockTime: 60,
    allowedTimes: 3,
    isDst: 1,
  };

  assertEquals(
    systemGeneral.decode(parse(systemGeneral.encode(value)).root),
    value,
  );
});

Deno.test("systemGeneral rejects an OSD format the firmware never writes", () => {
  const root = parse(
    '<SystemGeneral version="1.1"><osdFormat>ISO</osdFormat></SystemGeneral>',
  ).root;

  assertThrows(() => systemGeneral.decode(root), Error, '"ISO"');
});

Deno.test("systemGeneral decodes a request that sets only the clock", () => {
  const root = parse(
    '<SystemGeneral version="1.1"><hour>8</hour><minute>9</minute></SystemGeneral>',
  ).root;

  assertEquals(systemGeneral.decode(root), { hour: 8, minute: 9 });
});
