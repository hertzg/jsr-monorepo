import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { alertStream } from "./alert-stream.ts";

test("alertStream stamps each alert with the time it was decoded", () => {
  const before = Date.now();

  const alert = alertStream.codec.parse(
    "<EventNotificationAlert><eventType>VMD</eventType></EventNotificationAlert>",
  );

  const at = Date.parse(alert.at);
  assertEquals(at >= before && at <= Date.now(), true);
});
