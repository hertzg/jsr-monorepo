import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { alarmArea } from "./alarm-area.ts";

Deno.test("alarmArea decodes a request carrying every grid", () => {
  const root = parse(
    '<AlarmArea version="1.1"><chn>3</chn>' +
      "<mdArea><width>1</width><height>1</height><area>md-abc123</area></mdArea>" +
      "<personArea><width>2</width><height>1</height><area>person-abc123</area></personArea>" +
      "<vehicleArea><width>3</width><height>1</height><area>vehicle-abc123</area></vehicleArea>" +
      "<faceArea><width>4</width><height>1</height><area>face-abc123</area></faceArea>" +
      "<dogCatArea><width>5</width><height>1</height><area>dogcat-abc123</area></dogCatArea>" +
      "</AlarmArea>",
  ).root;

  assertEquals(alarmArea.decode(root), {
    chn: 3,
    mdArea: { width: 1, height: 1, area: "md-abc123" },
    personArea: { width: 2, height: 1, area: "person-abc123" },
    vehicleArea: { width: 3, height: 1, area: "vehicle-abc123" },
    faceArea: { width: 4, height: 1, area: "face-abc123" },
    dogCatArea: { width: 5, height: 1, area: "dogcat-abc123" },
  });
});

Deno.test("alarmArea round-trips through encode and decode", () => {
  const value = {
    chn: 0,
    vehicleArea: { width: 155, height: 100, area: "vehicle-def456" },
  };

  const xml = alarmArea.encode(value);

  assertEquals(alarmArea.decode(parse(xml).root), value);
});

Deno.test("alarmArea rejects a grid without its cells", () => {
  const root = parse(
    '<AlarmArea version="1.1"><faceArea><width>2</width><height>1</height>' +
      "</faceArea></AlarmArea>",
  ).root;

  assertThrows(() => alarmArea.decode(root), Error, "<area>");
});
