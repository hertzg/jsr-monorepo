import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { parseIsapi } from "../status/parse-isapi.ts";
import { decodeAlert } from "./decode-alert.ts";

test("decodeAlert reads an element with the channel from dynChannelID", () => {
  const root = parseIsapi(
    "<EventNotificationAlert><channelID>0</channelID><dynChannelID>3</dynChannelID>" +
      "<eventType>VMD</eventType></EventNotificationAlert>",
  );

  assertEquals(decodeAlert(root, "2026-10-21T16:44:20.004Z"), {
    channel: 3,
    eventType: "VMD",
    eventState: "active",
    dateTime: "",
    at: "2026-10-21T16:44:20.004Z",
  });
});

test("decodeAlert throws when there is no eventType", () => {
  const root = parseIsapi(
    "<EventNotificationAlert><channelID>1</channelID></EventNotificationAlert>",
  );

  assertThrows(() => decodeAlert(root, "x"), Error, "<eventType>");
});
