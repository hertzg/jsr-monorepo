import { assertEquals } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { read } from "../request.ts";
import { inputProxyChannels } from "./input-proxy-channels.ts";

Deno.test("inputProxyChannels.codec.parse reads every channel with its source", () => {
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

  assertEquals(inputProxyChannels.codec.parse(xml), [
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

Deno.test("inputProxyChannels.codec.parse returns an empty list for an empty document", () => {
  assertEquals(inputProxyChannels.codec.parse("<InputProxyChannelList/>"), []);
});

Deno.test("read(inputProxyChannels) requests the channel list path", async () => {
  const fetch = spy(resolvesNext([new Response("<InputProxyChannelList/>")]));

  await read({
    baseUrl: "http://192.0.2.10",
    username: "admin",
    password: "hunter2",
    fetch,
  }, inputProxyChannels);

  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels",
  );
});
