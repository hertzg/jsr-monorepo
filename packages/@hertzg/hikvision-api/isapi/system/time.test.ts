import { assertEquals, assertThrows } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { request } from "../request.ts";
import { deviceTime, parseTimeZoneOffset } from "./time.ts";

Deno.test("deviceTime.codec.parse reads an NTP-synced device document", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<Time version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<timeMode>NTP</timeMode>\n" +
    "<localTime>2026-10-22T11:33:52+04:00</localTime>\n" +
    "<timeZone>CST-4:00:00</timeZone>\n" +
    "</Time>\n";

  assertEquals(deviceTime.codec.parse(xml), {
    timeMode: "NTP",
    localTime: "2026-10-22T11:33:52+04:00",
    timeZone: "CST-4:00:00",
    utcOffsetMinutes: 240,
  });
});

Deno.test("deviceTime.codec.parse reads platformType from a platform-synced NVR", () => {
  const xml = "<Time><timeMode>platform</timeMode>" +
    "<platformType>EZVIZ</platformType>" +
    "<localTime>2026-10-22T11:33:52</localTime>" +
    "<timeZone>CST-1:00:00DST01:00:00,M3.5.0/02:00:00,M10.5.0/03:00:00</timeZone>" +
    "</Time>";

  assertEquals(deviceTime.codec.parse(xml), {
    timeMode: "platform",
    localTime: "2026-10-22T11:33:52",
    timeZone: "CST-1:00:00DST01:00:00,M3.5.0/02:00:00,M10.5.0/03:00:00",
    utcOffsetMinutes: 60,
    platformType: "EZVIZ",
  });
});

Deno.test("deviceTime.codec.parse leaves utcOffsetMinutes out when timeZone does not parse", () => {
  const xml = "<Time><timeMode>manual</timeMode>" +
    "<localTime>2026-10-22T11:33:52</localTime>" +
    "<timeZone>Asia/Tbilisi</timeZone></Time>";

  assertEquals(deviceTime.codec.parse(xml), {
    timeMode: "manual",
    localTime: "2026-10-22T11:33:52",
    timeZone: "Asia/Tbilisi",
  });
});

Deno.test("deviceTime.codec.parse throws when timeZone is missing", () => {
  assertThrows(
    () =>
      deviceTime.codec.parse(
        "<Time><timeMode>NTP</timeMode><localTime>2026-10-22T11:33:52</localTime></Time>",
      ),
    Error,
    "<timeZone>",
  );
});

Deno.test("parseTimeZoneOffset inverts the POSIX sign into an ISO offset", () => {
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

Deno.test("parseTimeZoneOffset accepts H, H:MM and H:MM:SS offsets", () => {
  assertEquals(parseTimeZoneOffset("IST-5:30"), 330);
  assertEquals(parseTimeZoneOffset("IST-5:30:00"), 330);
  assertEquals(parseTimeZoneOffset("NST+3:30"), -210);
  assertEquals(parseTimeZoneOffset("JST-9"), 540);
});

Deno.test("parseTimeZoneOffset returns undefined when there is no offset", () => {
  assertEquals(parseTimeZoneOffset("Asia/Tbilisi"), undefined);
  assertEquals(parseTimeZoneOffset("CST"), undefined);
  assertEquals(parseTimeZoneOffset(""), undefined);
  assertEquals(parseTimeZoneOffset("-4:00:00"), undefined);
});

Deno.test("request(deviceTime) requests the time path", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<Time><timeMode>NTP</timeMode><localTime>2026-10-22T11:33:52+04:00</localTime>" +
        "<timeZone>CST-4:00:00</timeZone></Time>",
    ),
  ]));

  const time = await request({
    baseUrl: "http://192.0.2.21",
    username: "admin",
    password: "hunter2",
    fetch,
  }, deviceTime);

  assertEquals(time.utcOffsetMinutes, 240);
  assertEquals(fetch.calls[0].args[0], "http://192.0.2.21/ISAPI/System/time");
});
