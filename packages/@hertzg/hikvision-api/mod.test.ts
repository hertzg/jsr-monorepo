import { assertEquals } from "@std/assert";
import { assertSpyCalls, resolvesNext, spy } from "@std/testing/mock";
import { createClient } from "./mod.ts";

const OPTIONS = {
  baseUrl: "http://192.0.2.10",
  username: "admin",
  password: "hunter2",
};

function urlOf(fetch: { calls: { args: unknown[] }[] }, index: number): string {
  return fetch.calls[index].args[0] as string;
}

Deno.test("createClient routes each reader to its path with the credentials", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<DeviceInfo><model>DS-7608NI-Q2/8P</model><firmwareVersion>V4.75.207</firmwareVersion>" +
        "<deviceType>NVR</deviceType></DeviceInfo>",
    ),
    new Response("<InputProxyChannelList/>"),
    new Response(
      "<MotionDetection><enabled>true</enabled>" +
        "<Grid><rowGranularity>1</rowGranularity><columnGranularity>8</columnGranularity></Grid>" +
        "<MotionDetectionLayout><layout><gridMap>ff</gridMap></layout></MotionDetectionLayout>" +
        "</MotionDetection>",
    ),
    new Response(
      "<FieldDetection><id>1</id><enabled>false</enabled></FieldDetection>",
    ),
    new Response(
      "<LineDetection><id>2</id><enabled>false</enabled></LineDetection>",
    ),
  ]));
  const nvr = createClient({ ...OPTIONS, fetch });

  const info = await nvr.deviceInfo();
  const channels = await nvr.channels();
  const motion = await nvr.motionDetection({ channel: 4, proxy: true });
  const field = await nvr.fieldDetection();
  const line = await nvr.lineDetection({ channel: 2 });

  assertEquals(info.model, "DS-7608NI-Q2/8P");
  assertEquals(channels, []);
  assertEquals(motion.grid, [[true, true, true, true, true, true, true, true]]);
  assertEquals(field.channel, 1);
  assertEquals(line.channel, 2);
  assertSpyCalls(fetch, 5);
  assertEquals(urlOf(fetch, 0), "http://192.0.2.10/ISAPI/System/deviceInfo");
  assertEquals(
    urlOf(fetch, 1),
    "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels",
  );
  assertEquals(
    urlOf(fetch, 2),
    "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/4/video/motionDetection",
  );
  assertEquals(
    urlOf(fetch, 3),
    "http://192.0.2.10/ISAPI/Smart/FieldDetection/1",
  );
  assertEquals(
    urlOf(fetch, 4),
    "http://192.0.2.10/ISAPI/Smart/LineDetection/2",
  );
  for (const call of fetch.calls) {
    const init = call.args[1] as RequestInit;
    assertEquals(
      new Headers(init.headers).get("authorization"),
      "Basic YWRtaW46aHVudGVyMg==",
    );
  }
});

Deno.test("createClient's request and xml send any path", async () => {
  const fetch = spy(resolvesNext([
    new Response("raw"),
    new Response("<Time><timeMode>NTP</timeMode></Time>"),
  ]));
  const nvr = createClient({ ...OPTIONS, fetch });

  const response = await nvr.request("/ISAPI/System/time", { method: "GET" });
  const time = await nvr.xml("/ISAPI/System/time");

  assertEquals(await response.text(), "raw");
  assertEquals(time.name.local, "Time");
  assertEquals(urlOf(fetch, 0), "http://192.0.2.10/ISAPI/System/time");
  assertEquals(urlOf(fetch, 1), "http://192.0.2.10/ISAPI/System/time");
});

Deno.test("createClient's subscribe opens the alert stream with the signal", async () => {
  const controller = new AbortController();
  const fetch = spy(resolvesNext([
    new Response("", {
      headers: { "content-type": "multipart/mixed;boundary=boundary" },
    }),
  ]));
  const nvr = createClient({ ...OPTIONS, fetch });

  const alerts = await Array.fromAsync(
    await nvr.subscribe({ signal: controller.signal }),
  );

  assertEquals(alerts, []);
  assertEquals(
    urlOf(fetch, 0),
    "http://192.0.2.10/ISAPI/Event/notification/alertStream",
  );
  assertEquals(
    (fetch.calls[0].args[1] as RequestInit).signal,
    controller.signal,
  );
});

Deno.test("createClient routes the status, time, capabilities and generic smart readers", async () => {
  const fetch = spy(resolvesNext([
    new Response("<InputProxyChannelStatusList/>"),
    new Response(
      "<Time><timeMode>NTP</timeMode><localTime>2026-10-22T11:33:52+04:00</localTime>" +
        "<timeZone>CST-4:00:00</timeZone></Time>",
    ),
    new Response(
      '<MotionDetection><regionType opt="grid,region">grid</regionType></MotionDetection>',
    ),
    new Response(
      "<RegionEntrance><id>3</id><enabled>true</enabled></RegionEntrance>",
    ),
  ]));
  const nvr = createClient({ ...OPTIONS, fetch });

  const status = await nvr.channelStatus();
  const time = await nvr.time();
  const capabilities = await nvr.motionDetectionCapabilities({
    channel: 1,
    proxy: true,
  });
  const rules = await nvr.smartRules({ type: "regionEntrance", channel: 3 });

  assertEquals(status, []);
  assertEquals(time.utcOffsetMinutes, 240);
  assertEquals(capabilities.regionTypes, ["grid", "region"]);
  assertEquals(rules.channel, 3);
  assertEquals(
    urlOf(fetch, 0),
    "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/status",
  );
  assertEquals(urlOf(fetch, 1), "http://192.0.2.10/ISAPI/System/time");
  assertEquals(
    urlOf(fetch, 2),
    "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/1/video/motionDetection/capabilities",
  );
  assertEquals(
    urlOf(fetch, 3),
    "http://192.0.2.10/ISAPI/Smart/regionEntrance/3",
  );
});
