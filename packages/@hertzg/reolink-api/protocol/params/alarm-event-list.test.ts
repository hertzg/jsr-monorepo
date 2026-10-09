import { assertEquals, assertThrows } from "@std/assert";
import { isElement, parse } from "@std/xml";
import { alarmEventList } from "./alarm-event-list.ts";

Deno.test("alarmEventList decodes the captured idle cmd 33 push", () => {
  const root = parse(
    '<?xml version="1.0" encoding="UTF-8" ?>\n<body>\n' +
      '<AlarmEventList version="1.1">\n<AlarmEvent version="1.1">\n' +
      "<channelId>0</channelId>\n<status>none</status>\n<AItype>none</AItype>\n" +
      "<recording>0</recording>\n<timeStamp>0</timeStamp>\n" +
      "</AlarmEvent>\n</AlarmEventList>\n</body>\n",
  ).root;
  const [element] = root.children.filter(isElement);

  assertEquals(alarmEventList.decode(element), {
    AlarmEvent: [{
      channelId: 0,
      status: "none",
      AItype: "none",
      recording: 0,
      timeStamp: 0,
    }],
  });
});

Deno.test("alarmEventList keeps comma-separated status and AI lists as text", () => {
  const root = parse(
    '<AlarmEventList version="1.1"><AlarmEvent version="1.1">' +
      "<channelId>1</channelId><status>MD,IOAlarm</status>" +
      "<AItype>people,dog_cat</AItype><recording>1</recording>" +
      "<timeStamp>1700000000</timeStamp></AlarmEvent></AlarmEventList>",
  ).root;

  assertEquals(
    alarmEventList.decode(root).AlarmEvent[0].AItype,
    "people,dog_cat",
  );
});

Deno.test("alarmEventList round-trips one event per channel", () => {
  const value = {
    AlarmEvent: [
      {
        channelId: 0,
        status: "MD",
        AItype: "vehicle",
        recording: 1,
        timeStamp: 11,
      },
      {
        channelId: 1,
        status: "none",
        AItype: "none",
        recording: 0,
        timeStamp: 22,
      },
    ],
  };

  assertEquals(
    alarmEventList.decode(parse(alarmEventList.encode(value)).root),
    value,
  );
});

Deno.test("alarmEventList rejects an event missing a field the camera always writes", () => {
  const root = parse(
    '<AlarmEventList version="1.1"><AlarmEvent><channelId>0</channelId>' +
      "<status>none</status><AItype>none</AItype><recording>0</recording>" +
      "</AlarmEvent></AlarmEventList>",
  ).root;

  assertThrows(() => alarmEventList.decode(root), Error, "<timeStamp>");
});
