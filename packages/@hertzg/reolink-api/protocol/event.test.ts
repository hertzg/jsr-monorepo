import { assertEquals } from "@std/assert";
import { parseAlarmEvents } from "./event.ts";

Deno.test("parseAlarmEvents reads a doorbell press with motion and a person", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    "<body>\n" +
    '<AlarmEventList version="1.1">\n' +
    '<AlarmEvent version="1.1">\n' +
    "<channelId>0</channelId>\n" +
    "<status>MD,visitor</status>\n" +
    "<recording>0</recording>\n" +
    "<timeStamp>0</timeStamp>\n" +
    "<AItype>people</AItype>\n" +
    "</AlarmEvent>\n" +
    "</AlarmEventList>\n" +
    "</body>\n";

  assertEquals(parseAlarmEvents(xml), [
    { channel: 0, motion: true, visitor: true, tamper: false, ai: ["people"] },
  ]);
});

Deno.test("parseAlarmEvents reports every flag off for status none", () => {
  const xml = "<body><AlarmEventList><AlarmEvent>" +
    "<channelId>0</channelId><status>none</status><AItype>none</AItype>" +
    "</AlarmEvent></AlarmEventList></body>";

  assertEquals(parseAlarmEvents(xml), [
    { channel: 0, motion: false, visitor: false, tamper: false, ai: [] },
  ]);
});

Deno.test("parseAlarmEvents keeps every AI type the camera sends", () => {
  const xml = "<body><AlarmEventList><AlarmEvent>" +
    "<channelId>2</channelId><status>MD</status>" +
    "<AItype>people,vehicle,dog_cat</AItype>" +
    "</AlarmEvent></AlarmEventList></body>";

  assertEquals(parseAlarmEvents(xml)[0].ai, ["people", "vehicle", "dog_cat"]);
});

Deno.test("parseAlarmEvents reads tamper", () => {
  const xml = "<body><AlarmEventList><AlarmEvent>" +
    "<channelId>0</channelId><status>tamper</status>" +
    "</AlarmEvent></AlarmEventList></body>";

  assertEquals(parseAlarmEvents(xml)[0].tamper, true);
});

Deno.test("parseAlarmEvents returns one event per channel in a push", () => {
  const xml = "<body><AlarmEventList>" +
    "<AlarmEvent><channelId>0</channelId><status>MD</status></AlarmEvent>" +
    "<AlarmEvent><channelId>1</channelId><status>none</status></AlarmEvent>" +
    "</AlarmEventList></body>";

  assertEquals(parseAlarmEvents(xml).map((event) => event.channel), [0, 1]);
});

Deno.test("parseAlarmEvents skips events without a channel id", () => {
  const xml = "<body><AlarmEventList>" +
    "<AlarmEvent><status>MD</status></AlarmEvent>" +
    "</AlarmEventList></body>";

  assertEquals(parseAlarmEvents(xml), []);
});

Deno.test("parseAlarmEvents ignores other events in the same push", () => {
  const xml = "<body><DayNightEventList><DayNightEvent>" +
    "<channelId>0</channelId><mode>day</mode>" +
    "</DayNightEvent></DayNightEventList></body>";

  assertEquals(parseAlarmEvents(xml), []);
});
