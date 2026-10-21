import { assertEquals } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { parseInputProxyChannels, readInputProxyChannels } from "./channels.ts";

Deno.test("parseInputProxyChannels reads every channel with its source", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<InputProxyChannelList version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    '<InputProxyChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>1</id>\n" +
    "<name>Camera 01</name>\n" +
    "<sourceInputPortDescriptor>\n" +
    "<proxyProtocol>HIKVISION</proxyProtocol>\n" +
    "<addressingFormatType>ipaddress</addressingFormatType>\n" +
    "<ipAddress>192.0.2.21</ipAddress>\n" +
    "<managePortNo>8000</managePortNo>\n" +
    "<srcInputPort>1</srcInputPort>\n" +
    "<userName>admin</userName>\n" +
    "<streamType>auto</streamType>\n" +
    "</sourceInputPortDescriptor>\n" +
    "<enableAnr>false</enableAnr>\n" +
    "</InputProxyChannel>\n" +
    '<InputProxyChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>2</id>\n" +
    "<name>Camera 02</name>\n" +
    "<sourceInputPortDescriptor>\n" +
    "<proxyProtocol>ONVIF</proxyProtocol>\n" +
    "<ipAddress>192.0.2.22</ipAddress>\n" +
    "<managePortNo>80</managePortNo>\n" +
    "<srcInputPort>1</srcInputPort>\n" +
    "</sourceInputPortDescriptor>\n" +
    "</InputProxyChannel>\n" +
    "</InputProxyChannelList>\n";

  assertEquals(parseInputProxyChannels(xml), [
    {
      id: 1,
      name: "Camera 01",
      proxyProtocol: "HIKVISION",
      ipAddress: "192.0.2.21",
      managePortNo: 8000,
      srcInputPort: 1,
    },
    {
      id: 2,
      name: "Camera 02",
      proxyProtocol: "ONVIF",
      ipAddress: "192.0.2.22",
      managePortNo: 80,
      srcInputPort: 1,
    },
  ]);
});

Deno.test("parseInputProxyChannels returns an empty list for an empty document", () => {
  assertEquals(parseInputProxyChannels("<InputProxyChannelList/>"), []);
});

Deno.test("readInputProxyChannels requests the channel list path", async () => {
  const fetch = spy(resolvesNext([new Response("<InputProxyChannelList/>")]));

  await readInputProxyChannels({
    baseUrl: "http://192.0.2.10",
    username: "admin",
    password: "hunter2",
    fetch,
  });

  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels",
  );
});
