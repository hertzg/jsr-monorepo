import { assertEquals } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { test } from "node:test";
import {
  alertStream,
  fieldDetection,
  motionDetection,
  request,
  smartRules,
  stream,
} from "./mod.ts";

const DEVICE = {
  baseUrl: "http://192.0.2.10",
  username: "admin",
  password: "hunter2",
};

test("request routes a parameterized resource to its path", async () => {
  const fetch = spy(resolvesNext([
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
      "<RegionEntrance><id>3</id><enabled>true</enabled></RegionEntrance>",
    ),
  ]));
  const nvr = { ...DEVICE, fetch };

  const motion = await request(
    nvr,
    motionDetection({ channel: 4, proxy: true }),
  );
  const field = await request(nvr, fieldDetection());
  const rules = await request(
    nvr,
    smartRules({ type: "regionEntrance", channel: 3 }),
  );

  assertEquals(motion.grid, [[true, true, true, true, true, true, true, true]]);
  assertEquals(field.channel, 1);
  assertEquals(rules.channel, 3);
  assertEquals(
    fetch.calls.map((call) => call.args[0]),
    [
      "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/4/video/motionDetection",
      "http://192.0.2.10/ISAPI/Smart/FieldDetection/1",
      "http://192.0.2.10/ISAPI/Smart/regionEntrance/3",
    ],
  );
});

test("request with a path sends any method", async () => {
  const fetch = spy(resolvesNext([new Response("raw")]));

  const response = await request(
    { ...DEVICE, fetch },
    "/ISAPI/System/reboot",
    { method: "PUT" },
  );

  assertEquals(await response.text(), "raw");
  assertEquals(fetch.calls[0].args[0], "http://192.0.2.10/ISAPI/System/reboot");
  assertEquals((fetch.calls[0].args[1] as RequestInit).method, "PUT");
});

test("stream opens the alert stream with the signal", async () => {
  const controller = new AbortController();
  const fetch = spy(resolvesNext([
    new Response("", {
      headers: { "content-type": "multipart/mixed;boundary=boundary" },
    }),
  ]));

  const alerts = await Array.fromAsync(
    await stream({ ...DEVICE, fetch }, alertStream, {
      signal: controller.signal,
    }),
  );

  assertEquals(alerts, []);
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/Event/notification/alertStream",
  );
  assertEquals(
    (fetch.calls[0].args[1] as RequestInit).signal,
    controller.signal,
  );
});
