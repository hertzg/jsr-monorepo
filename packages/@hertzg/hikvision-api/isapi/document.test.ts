import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import {
  attribute,
  attributes,
  bool,
  decodeFields,
  document,
  int,
  list,
  obj,
  optional,
  points,
  repeated,
  text,
  tokens,
} from "./document.ts";
import { IsapiError } from "./status.ts";

Deno.test("text decodes the child's text", () => {
  const root = parse("<P><model>DS-7608NI-Q2/8P</model></P>").root;

  assertEquals(text().decode(root, "model"), "DS-7608NI-Q2/8P");
});

Deno.test("int decodes the child's text as a number", () => {
  const root = parse("<P><channelID>7</channelID></P>").root;

  assertEquals(int().decode(root, "channelID"), 7);
});

Deno.test("bool decodes true as true and anything else as false", () => {
  const root = parse("<P><a>true</a><b>false</b><c>yes</c></P>").root;

  assertEquals(
    [
      bool().decode(root, "a"),
      bool().decode(root, "b"),
      bool().decode(root, "c"),
    ],
    [true, false, false],
  );
});

Deno.test("tokens splits a comma-separated child into trimmed items", () => {
  const root = parse("<P><targetType>human, vehicle,</targetType></P>").root;

  assertEquals(tokens().decode(root, "targetType"), ["human", "vehicle"]);
});

Deno.test("int throws on non-numeric text and names the element", () => {
  const root = parse("<P><channelID>seven</channelID></P>").root;

  assertThrows(
    () => int().decode(root, "channelID"),
    Error,
    'ISAPI <channelID> is not a number: "seven"',
  );
});

Deno.test("a required field that is missing throws naming parent and field", () => {
  const root = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;

  assertThrows(
    () => decodeFields({ serialNumber: text() }, root),
    Error,
    "ISAPI <DeviceInfo> has no <serialNumber>",
  );
});

Deno.test("an optional field that is absent is left out of the object", () => {
  const root = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;

  const result = decodeFields(
    { model: text(), serialNumber: optional(text()) },
    root,
  );

  assertEquals(result, { model: "X" });
});

Deno.test("an optional field that is absent has no key on the object", () => {
  const root = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;

  const result = decodeFields(
    { model: text(), serialNumber: optional(text()) },
    root,
  );

  assertEquals("serialNumber" in result, false);
});

Deno.test("obj decodes a nested element", () => {
  const root = parse(
    "<M><Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid></M>",
  ).root;

  const grid = obj({ rowGranularity: int(), columnGranularity: int() });

  assertEquals(grid.decode(root, "Grid"), {
    rowGranularity: 18,
    columnGranularity: 22,
  });
});

Deno.test("repeated returns an empty array when there are no items", () => {
  const root = parse("<List/>").root;

  assertEquals(repeated(obj({ id: int() })).decode(root, "Item"), []);
});

Deno.test("repeated returns every item in document order", () => {
  const root = parse(
    "<List><Item><id>1</id></Item><Other/><Item><id>2</id></Item></List>",
  ).root;

  assertEquals(repeated(obj({ id: int() })).decode(root, "Item"), [
    { id: 1 },
    { id: 2 },
  ]);
});

Deno.test("list returns an empty array when the wrapper is missing", () => {
  const root = parse("<Root/>").root;

  assertEquals(
    list("Region", obj({ id: int() })).decode(root, "RegionList"),
    [],
  );
});

Deno.test("list returns the items of a present wrapper", () => {
  const root = parse(
    "<Root><RegionList><Region><id>1</id></Region><Region><id>2</id></Region></RegionList></Root>",
  ).root;

  assertEquals(list("Region", obj({ id: int() })).decode(root, "RegionList"), [
    { id: 1 },
    { id: 2 },
  ]);
});

Deno.test("points reads pairs whatever the pair element is called", () => {
  const root = parse(
    "<Line><CoordinatesList>" +
      "<Coordinates><positionX>826</positionX><positionY>767</positionY></Coordinates>" +
      "<RegionCoordinates><positionX>880</positionX><positionY>762</positionY></RegionCoordinates>" +
      "</CoordinatesList></Line>",
  ).root;

  assertEquals(points().decode(root, "CoordinatesList"), [
    { x: 826, y: 767 },
    { x: 880, y: 762 },
  ]);
});

Deno.test("attribute reads and converts the attribute of the child", () => {
  const root = parse('<Cap><step step="20">x</step></Cap>').root;

  assertEquals(attribute("step", Number).decode(root, "step"), 20);
});

Deno.test("attribute throws when the attribute is missing", () => {
  const root = parse("<Cap><regionType>grid</regionType></Cap>").root;

  assertThrows(
    () => attribute("opt").decode(root, "regionType"),
    Error,
    "ISAPI <regionType> has no opt attribute",
  );
});

Deno.test("attributes yields only the keys that are present", () => {
  const root = parse(
    '<Cap><sensitivityLevel min="0" max="100">40</sensitivityLevel></Cap>',
  ).root;

  const range = attributes({ min: Number, max: Number, step: Number });

  assertEquals(range.decode(root, "sensitivityLevel"), { min: 0, max: 100 });
});

Deno.test("decodeFields reads a root whose name is dynamic", () => {
  const root = parse("<Channel7><name>Camera 07</name></Channel7>").root;

  assertEquals(decodeFields({ name: text() }, root), { name: "Camera 07" });
});

Deno.test("document.parse throws IsapiError on a failing ResponseStatus body", () => {
  const codec = document({ model: text() });
  const xml = "<ResponseStatus><statusCode>4</statusCode>" +
    "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";

  assertThrows(() => codec.parse(xml), IsapiError, "notSupport");
});

Deno.test("document matches namespace-prefixed elements by local name", () => {
  const codec = document({ timeMode: text(), localTime: text() });
  const xml =
    '<Time xmlns="http://www.hikvision.com/ver20/XMLSchema" version="1.0">' +
    "<timeMode>NTP</timeMode><localTime>2026-10-22T11:33:52+04:00</localTime></Time>";

  assertEquals(codec.parse(xml), {
    timeMode: "NTP",
    localTime: "2026-10-22T11:33:52+04:00",
  });
});
