/**
 * Tests for `parseIsapi`.
 *
 * @module
 */

import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { IsapiError } from "./isapi-error.ts";
import { parseIsapi } from "./parse-isapi.ts";

test("parseIsapi returns the root of an ordinary document", () => {
  const root = parseIsapi("<Time><timeMode>NTP</timeMode></Time>");

  assertEquals(root.name.local, "Time");
});

test("parseIsapi throws IsapiError carrying the full status for notSupport", () => {
  const xml = "<ResponseStatus><requestURL>/ISAPI/Smart</requestURL>" +
    "<statusCode>4</statusCode><statusString>Invalid Operation</statusString>" +
    "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";

  const error = assertThrows(() => parseIsapi(xml), IsapiError);

  assertEquals(
    [error.url, error.statusCode, error.statusString, error.subStatusCode],
    ["/ISAPI/Smart", 4, "Invalid Operation", "notSupport"],
  );
});

test("parseIsapi accepts statusCode 0", () => {
  const root = parseIsapi(
    "<ResponseStatus><statusCode>0</statusCode></ResponseStatus>",
  );

  assertEquals(root.name.local, "ResponseStatus");
});

test("parseIsapi accepts statusCode 1", () => {
  const root = parseIsapi(
    "<ResponseStatus><statusCode>1</statusCode></ResponseStatus>",
  );

  assertEquals(root.name.local, "ResponseStatus");
});

test("parseIsapi throws for statusCode 7", () => {
  assertThrows(
    () =>
      parseIsapi("<ResponseStatus><statusCode>7</statusCode></ResponseStatus>"),
    IsapiError,
  );
});
