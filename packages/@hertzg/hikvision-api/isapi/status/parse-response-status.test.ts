/**
 * Tests for `parseResponseStatus`.
 *
 * @module
 */

import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { parseResponseStatus } from "./parse-response-status.ts";

test("parseResponseStatus leaves absent optional fields out", () => {
  const root = parse(
    "<ResponseStatus><statusCode>4</statusCode></ResponseStatus>",
  ).root;

  assertEquals(parseResponseStatus(root), { statusCode: 4 });
});
