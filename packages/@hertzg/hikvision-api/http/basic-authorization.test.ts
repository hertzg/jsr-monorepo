import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { basicAuthorization } from "./basic-authorization.ts";

test("basicAuthorization encodes username:password as base64", () => {
  assertEquals(
    basicAuthorization("admin", "hunter2"),
    "Basic YWRtaW46aHVudGVyMg==",
  );
});

test("basicAuthorization encodes a non-Latin-1 password as UTF-8", () => {
  assertEquals(
    basicAuthorization("admin", "pässwörd€"),
    "Basic YWRtaW46cMOkc3N3w7ZyZOKCrA==",
  );
});
