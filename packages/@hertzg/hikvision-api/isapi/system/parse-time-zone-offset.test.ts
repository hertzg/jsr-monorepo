import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parseTimeZoneOffset } from "./parse-time-zone-offset.ts";

test("parseTimeZoneOffset inverts the POSIX sign into an ISO offset", () => {
  assertEquals(parseTimeZoneOffset("CST-4:00:00"), 240);
  assertEquals(parseTimeZoneOffset("CST+3:00:00"), -180);
  assertEquals(
    parseTimeZoneOffset("EST+5EDT01:00:00,M3.2.0/02:00:00,M11.1.0/02:00:00"),
    -300,
  );
  assertEquals(
    parseTimeZoneOffset(
      "CST-1:00:00DST01:00:00,M3.5.0/02:00:00,M10.5.0/03:00:00",
    ),
    60,
  );
  assertEquals(parseTimeZoneOffset("UTC0"), 0);
  assertEquals(parseTimeZoneOffset("GMT0"), 0);
});

test("parseTimeZoneOffset accepts H, H:MM and H:MM:SS offsets", () => {
  assertEquals(parseTimeZoneOffset("IST-5:30"), 330);
  assertEquals(parseTimeZoneOffset("IST-5:30:00"), 330);
  assertEquals(parseTimeZoneOffset("NST+3:30"), -210);
  assertEquals(parseTimeZoneOffset("JST-9"), 540);
});

test("parseTimeZoneOffset returns undefined when there is no offset", () => {
  assertEquals(parseTimeZoneOffset("Asia/Tbilisi"), undefined);
  assertEquals(parseTimeZoneOffset("CST"), undefined);
  assertEquals(parseTimeZoneOffset(""), undefined);
  assertEquals(parseTimeZoneOffset("-4:00:00"), undefined);
});
