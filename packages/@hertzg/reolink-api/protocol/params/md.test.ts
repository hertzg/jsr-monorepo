import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { type Md, md } from "./md.ts";

Deno.test("md decodes every element net_md_s2x writes", () => {
  const root = parse(
    '<MD version="1.1"><channelId>0</channelId><enable>1</enable>' +
      "<usepir>0</usepir><width>96</width><height>64</height>" +
      "<scope><columns>96</columns><rows>64</rows><valueTable>AAEB</valueTable></scope>" +
      "<sensitivityInfoList><sensitivityInfo><id>0</id><sensitivity>41</sensitivity>" +
      "<beginHour>1</beginHour><beginMinute>2</beginMinute><endHour>3</endHour>" +
      "<endMinute>4</endMinute></sensitivityInfo></sensitivityInfoList>" +
      "<sensInfoNew><sensitivityDefault>25</sensitivityDefault><sensInfoList>" +
      "<sensInfo><priority>7</priority><sensitivity>42</sensitivity>" +
      "<beginHour>5</beginHour><beginMinute>6</beginMinute><endHour>8</endHour>" +
      "<endMinute>9</endMinute></sensInfo></sensInfoList></sensInfoNew>" +
      "<timeBlockList><timeBlock><enable>1</enable><weekDay>Sunday</weekDay>" +
      "<beginHour>10</beginHour><endHour>12</endHour></timeBlock></timeBlockList>" +
      "<handleException><handleType>rec,push</handleType>" +
      "<chnHandleType>chn-table</chnHandleType><relAlarmOut>alarm-table</relAlarmOut>" +
      "</handleException></MD>",
  ).root;

  assertEquals(md.decode(root), {
    channelId: 0,
    enable: 1,
    usepir: 0,
    width: 96,
    height: 64,
    scope: { columns: 96, rows: 64, valueTable: "AAEB" },
    sensitivityInfoList: [{
      id: 0,
      sensitivity: 41,
      beginHour: 1,
      beginMinute: 2,
      endHour: 3,
      endMinute: 4,
    }],
    sensInfoNew: {
      sensitivityDefault: 25,
      sensInfoList: [{
        priority: 7,
        sensitivity: 42,
        beginHour: 5,
        beginMinute: 6,
        endHour: 8,
        endMinute: 9,
      }],
    },
    timeBlockList: [{
      enable: 1,
      weekDay: "Sunday",
      beginHour: 10,
      endHour: 12,
    }],
    handleException: {
      handleType: "rec,push",
      chnHandleType: "chn-table",
      relAlarmOut: "alarm-table",
    },
  });
});

Deno.test("md decodes a scope without valueTable, which the camera may leave out", () => {
  const root = parse(
    '<MD version="1.1"><scope><columns>120</columns><rows>80</rows></scope></MD>',
  ).root;

  assertEquals(md.decode(root).scope, { columns: 120, rows: 80 });
});

Deno.test("md round-trips a schedule update", () => {
  const value: Md = {
    channelId: 1,
    timeBlockList: [
      { enable: 1, weekDay: "Monday", beginHour: 8, endHour: 17 },
      { enable: 0, weekDay: "Saturday", beginHour: 0, endHour: 23 },
    ],
  };

  assertEquals(md.decode(parse(md.encode(value)).root), value);
});

Deno.test("md rejects a time block with an unknown weekday", () => {
  const root = parse(
    '<MD version="1.1"><timeBlockList><timeBlock><enable>1</enable>' +
      "<weekDay>Funday</weekDay><beginHour>0</beginHour><endHour>1</endHour>" +
      "</timeBlock></timeBlockList></MD>",
  ).root;

  assertThrows(() => md.decode(root), Error, '"Funday"');
});

Deno.test("md rejects a sensInfo without priority", () => {
  const root = parse(
    '<MD version="1.1"><sensInfoNew><sensInfoList><sensInfo>' +
      "<sensitivity>10</sensitivity></sensInfo></sensInfoList></sensInfoNew></MD>",
  ).root;

  assertThrows(() => md.decode(root), Error, "<priority>");
});
