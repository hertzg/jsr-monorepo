/**
 * Tests for `IsapiError`.
 *
 * @module
 */

import { test } from "node:test";
import { assertEquals, assertInstanceOf } from "@std/assert";
import { IsapiError } from "./isapi-error.ts";

test("IsapiError message names the url, code and reason from the body alone", () => {
  const error = new IsapiError({
    status: {
      requestURL: "/ISAPI/Smart",
      statusCode: 4,
      subStatusCode: "notSupport",
    },
  });

  assertEquals(error.message, "ISAPI /ISAPI/Smart failed: 4 notSupport");
});

test("IsapiError message names the HTTP status and the body when both are known", () => {
  const error = new IsapiError({
    url: "http://192.0.2.10/ISAPI/Smart",
    httpStatus: 403,
    status: { statusCode: 4, subStatusCode: "notSupport" },
  });

  assertEquals(
    error.message,
    "ISAPI http://192.0.2.10/ISAPI/Smart failed: HTTP 403, 4 notSupport",
  );
});

test("IsapiError message names only the HTTP status when there was no body", () => {
  const error = new IsapiError({
    url: "http://192.0.2.10/ISAPI/System/time",
    httpStatus: 401,
  });

  assertEquals(
    error.message,
    "ISAPI http://192.0.2.10/ISAPI/System/time failed: HTTP 401",
  );
});

test("IsapiError is an Error", () => {
  const error = new IsapiError({ status: { statusCode: 7 } });

  assertInstanceOf(error, Error);
});
