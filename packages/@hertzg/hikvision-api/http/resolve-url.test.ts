import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { resolveUrl } from "./resolve-url.ts";

test("resolveUrl drops trailing slashes and keeps the port", () => {
  const device = {
    baseUrl: "http://192.0.2.10:65001//",
    username: "admin",
    password: "hunter2",
  };

  assertEquals(
    resolveUrl(device, "/ISAPI/System/time"),
    "http://192.0.2.10:65001/ISAPI/System/time",
  );
});
