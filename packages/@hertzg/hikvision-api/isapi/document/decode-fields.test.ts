import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { attribute } from "./attribute.ts";
import { decodeFields } from "./decode-fields.ts";
import { int } from "./int.ts";
import { optional } from "./optional.ts";
import { repeated } from "./repeated.ts";
import { text } from "./text.ts";

test("decodeFields reads each field from the child of its name", () => {
  const root = parse("<P><model>X</model><channelID>7</channelID></P>").root;

  assertEquals(decodeFields({ model: text(), channelID: int() }, root), {
    model: "X",
    channelID: 7,
  });
});

test("decodeFields throws for a missing required field naming parent and field", () => {
  const root = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;

  assertThrows(
    () => decodeFields({ serialNumber: text() }, root),
    Error,
    "ISAPI <DeviceInfo> has no <serialNumber>",
  );
});

test("decodeFields leaves an absent optional field without a key", () => {
  const root = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;

  const result = decodeFields(
    { model: text(), serialNumber: optional(text()) },
    root,
  );

  assertEquals("serialNumber" in result, false);
});

test("decodeFields hands a many field every child of its name, zero included", () => {
  const root = parse("<L><Item>1</Item><Other/><Item>2</Item></L>").root;

  assertEquals(
    decodeFields({ Item: repeated(int()), Missing: repeated(int()) }, root),
    { Item: [1, 2], Missing: [] },
  );
});

test("decodeFields reads the first child when there are several of one name", () => {
  const root = parse("<L><id>1</id><id>2</id></L>").root;

  assertEquals(decodeFields({ id: int() }, root), { id: 1 });
});

test("decodeFields matches namespace-prefixed elements by local name", () => {
  const root = parse(
    '<Time xmlns="http://www.hikvision.com/ver20/XMLSchema"><timeMode>NTP</timeMode></Time>',
  ).root;

  assertEquals(decodeFields({ timeMode: text() }, root), { timeMode: "NTP" });
});

test("decodeFields reads an empty optional element as absent", () => {
  const root = parse(
    "<DetectionRegionEntry><regionID></regionID><sensitivityLevel>0</sensitivityLevel></DetectionRegionEntry>",
  ).root;

  const entry = decodeFields(
    { regionID: optional(int()), sensitivityLevel: optional(int()) },
    root,
  );

  assertEquals(entry, { sensitivityLevel: 0 });
});

test("decodeFields reads a whitespace-only optional element as absent", () => {
  const root = parse("<E><regionID>\n </regionID></E>").root;

  assertEquals(decodeFields({ regionID: optional(int()) }, root), {});
});

test("decodeFields still throws for an empty required element", () => {
  const root = parse("<E><regionID></regionID></E>").root;

  assertThrows(
    () => decodeFields({ regionID: int() }, root),
    Error,
    'ISAPI <regionID> is not a number: ""',
  );
});

test("decodeFields keeps an empty optional element that has attributes", () => {
  const root = parse('<Cap><regionType opt="grid,region"/></Cap>').root;

  assertEquals(
    decodeFields({ regionType: optional(attribute("opt")) }, root),
    { regionType: "grid,region" },
  );
});
