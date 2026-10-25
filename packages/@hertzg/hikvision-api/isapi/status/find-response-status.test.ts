/**
 * Tests for `findResponseStatus`.
 *
 * @module
 */

import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { findResponseStatus } from "./find-response-status.ts";

test("findResponseStatus returns undefined for a body that is not XML", () => {
  assertEquals(findResponseStatus("Unauthorized"), undefined);
});

test("findResponseStatus returns undefined for another document", () => {
  assertEquals(
    findResponseStatus("<Time><timeMode>NTP</timeMode></Time>"),
    undefined,
  );
});

test("findResponseStatus returns the status of a ResponseStatus", () => {
  const xml = "<ResponseStatus><statusCode>4</statusCode>" +
    "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";

  assertEquals(findResponseStatus(xml), {
    statusCode: 4,
    subStatusCode: "notSupport",
  });
});
