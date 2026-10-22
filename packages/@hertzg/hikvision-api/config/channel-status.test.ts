import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { IsapiError } from "../isapi/status.ts";
import {
  parseInputProxyChannelStatus,
  readInputProxyChannelStatus,
} from "./channel-status.ts";

Deno.test("parseInputProxyChannelStatus reads every field of an NVR document", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<InputProxyChannelStatusList version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    '<InputProxyChannelStatus version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>1</id>\n" +
    "<sourceInputPortDescriptor>\n" +
    "<proxyProtocol>HIKVISION</proxyProtocol>\n" +
    "<addressingFormatType>ipaddress</addressingFormatType>\n" +
    "<ipAddress>192.0.2.21</ipAddress>\n" +
    "<managePortNo>8000</managePortNo>\n" +
    "<srcInputPort>1</srcInputPort>\n" +
    "<userName>admin</userName>\n" +
    "<connMode>plugplay</connMode>\n" +
    "<streamType>auto</streamType>\n" +
    "<deviceID></deviceID>\n" +
    "</sourceInputPortDescriptor>\n" +
    "<online>true</online>\n" +
    "<streamingProxyChannelIdList>\n" +
    "<streamingProxyChannelId>101</streamingProxyChannelId>\n" +
    "<streamingProxyChannelId>102</streamingProxyChannelId>\n" +
    "</streamingProxyChannelIdList>\n" +
    "<relatedIOProxy><relatedIOProxyId>1</relatedIOProxyId></relatedIOProxy>\n" +
    "<chanDetectResult>connect</chanDetectResult>\n" +
    "<url>http://192.0.2.10:65001</url>\n" +
    "<SecurityStatus><PasswordStatus>strong</PasswordStatus></SecurityStatus>\n" +
    "</InputProxyChannelStatus>\n" +
    '<InputProxyChannelStatus version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>2</id>\n" +
    "<sourceInputPortDescriptor>\n" +
    "<proxyProtocol>ONVIF</proxyProtocol>\n" +
    "<ipAddress>192.0.2.22</ipAddress>\n" +
    "<managePortNo>80</managePortNo>\n" +
    "<srcInputPort>1</srcInputPort>\n" +
    "<connMode>manual</connMode>\n" +
    "</sourceInputPortDescriptor>\n" +
    "<online>false</online>\n" +
    "<streamingProxyChannelIdList>\n" +
    "<streamingProxyChannelId>201</streamingProxyChannelId>\n" +
    "</streamingProxyChannelIdList>\n" +
    "<chanDetectResult>errorUserNameOrPasswd</chanDetectResult>\n" +
    "<url>http://192.0.2.22:80</url>\n" +
    "<SecurityStatus><PasswordStatus>weak</PasswordStatus></SecurityStatus>\n" +
    "</InputProxyChannelStatus>\n" +
    "</InputProxyChannelStatusList>\n";

  assertEquals(parseInputProxyChannelStatus(xml), [
    {
      id: 1,
      online: true,
      chanDetectResult: "connect",
      url: "http://192.0.2.10:65001",
      ipAddress: "192.0.2.21",
      proxyProtocol: "HIKVISION",
      managePortNo: 8000,
      srcInputPort: 1,
      connMode: "plugplay",
      passwordStatus: "strong",
      streamingProxyChannelIds: [101, 102],
    },
    {
      id: 2,
      online: false,
      chanDetectResult: "errorUserNameOrPasswd",
      url: "http://192.0.2.22:80",
      ipAddress: "192.0.2.22",
      proxyProtocol: "ONVIF",
      managePortNo: 80,
      srcInputPort: 1,
      connMode: "manual",
      passwordStatus: "weak",
      streamingProxyChannelIds: [201],
    },
  ]);
});

Deno.test("parseInputProxyChannelStatus leaves optional fields out when absent", () => {
  const xml = "<InputProxyChannelStatusList><InputProxyChannelStatus>" +
    "<id>3</id><online>false</online>" +
    "</InputProxyChannelStatus></InputProxyChannelStatusList>";

  assertEquals(parseInputProxyChannelStatus(xml), [{ id: 3, online: false }]);
});

Deno.test("parseInputProxyChannelStatus returns an empty list for an empty document", () => {
  assertEquals(
    parseInputProxyChannelStatus("<InputProxyChannelStatusList/>"),
    [],
  );
});

Deno.test("parseInputProxyChannelStatus throws when online is missing", () => {
  assertThrows(
    () =>
      parseInputProxyChannelStatus(
        "<InputProxyChannelStatusList><InputProxyChannelStatus><id>1</id>" +
          "</InputProxyChannelStatus></InputProxyChannelStatusList>",
      ),
    Error,
    "<online>",
  );
});

Deno.test("readInputProxyChannelStatus requests the channel status path", async () => {
  const fetch = spy(resolvesNext([
    new Response("<InputProxyChannelStatusList/>"),
  ]));

  await readInputProxyChannelStatus({
    baseUrl: "http://192.0.2.10",
    username: "admin",
    password: "hunter2",
    fetch,
  });

  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/status",
  );
});

Deno.test("readInputProxyChannelStatus surfaces a camera's ResponseStatus as IsapiError", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<ResponseStatus><statusCode>4</statusCode><subStatusCode>notSupport</subStatusCode></ResponseStatus>",
    ),
  ]));

  await assertRejects(
    () =>
      readInputProxyChannelStatus({
        baseUrl: "http://192.0.2.21",
        username: "admin",
        password: "hunter2",
        fetch,
      }),
    IsapiError,
    "notSupport",
  );
});
