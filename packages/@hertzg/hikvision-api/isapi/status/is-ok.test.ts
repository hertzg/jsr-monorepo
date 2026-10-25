/**
 * Tests for `isOk`.
 *
 * @module
 */

import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { isOk } from "./is-ok.ts";

test("isOk is true only for statusCode 0 and 1", () => {
  assertEquals(
    [0, 1, 2, 4, 7].map((statusCode) => isOk({ statusCode })),
    [true, true, false, false, false],
  );
});
