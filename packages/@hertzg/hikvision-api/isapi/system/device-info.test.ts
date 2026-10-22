import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { IsapiError } from "../status.ts";
import { read } from "../request.ts";
import { deviceInfo } from "./device-info.ts";

Deno.test("deviceInfo.codec.parse reads every field of an NVR document", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<DeviceInfo version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<deviceName>Embedded Net DVR</deviceName>\n" +
    "<deviceID>00000000-0000-0000-0000-000000000000</deviceID>\n" +
    "<model>DS-7608NI-Q2/8P</model>\n" +
    "<serialNumber>DS-7608NI-Q2/8P0000000000AAAAAAAAAAAAA</serialNumber>\n" +
    "<macAddress>02:00:00:00:00:01</macAddress>\n" +
    "<firmwareVersion>V4.75.207</firmwareVersion>\n" +
    "<firmwareReleasedDate>build 250101</firmwareReleasedDate>\n" +
    "<deviceType>NVR</deviceType>\n" +
    "<telecontrolID>88</telecontrolID>\n" +
    "</DeviceInfo>\n";

  assertEquals(deviceInfo.codec.parse(xml), {
    deviceName: "Embedded Net DVR",
    deviceID: "00000000-0000-0000-0000-000000000000",
    model: "DS-7608NI-Q2/8P",
    serialNumber: "DS-7608NI-Q2/8P0000000000AAAAAAAAAAAAA",
    macAddress: "02:00:00:00:00:01",
    firmwareVersion: "V4.75.207",
    firmwareReleasedDate: "build 250101",
    deviceType: "NVR",
  });
});

Deno.test("deviceInfo.codec.parse throws when a required field is missing", () => {
  assertThrows(
    () =>
      deviceInfo.codec.parse(
        "<DeviceInfo><model>X</model><deviceType>NVR</deviceType></DeviceInfo>",
      ),
    Error,
    "<firmwareVersion>",
  );
});

Deno.test("read(deviceInfo) surfaces a ResponseStatus as IsapiError", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>3</statusCode><subStatusCode>deviceError</subStatusCode></ResponseStatus>",
    ),
  ]));

  await assertRejects(
    () =>
      read({
        baseUrl: "http://192.0.2.10",
        username: "admin",
        password: "hunter2",
        fetch,
      }, deviceInfo),
    IsapiError,
    "deviceError",
  );
});
