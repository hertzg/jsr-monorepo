import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
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
