import { assertEquals } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { request } from "../request.ts";
import { motionDetection } from "./motion-detection.ts";

Deno.test("motionDetection path picks the input proxy path for an NVR channel", () => {
  assertEquals(
    motionDetection({ channel: 5, proxy: true }).path,
    "/ISAPI/ContentMgmt/InputProxy/channels/5/video/motionDetection",
  );
  assertEquals(
    motionDetection({ channel: 1 }).path,
    "/ISAPI/System/Video/inputs/channels/1/motionDetection",
  );
});

Deno.test("motionDetection codec reads a grid-only document from an NVR", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<MotionDetection version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">\n' +
    "<enabled>true</enabled>\n" +
    "<enableHighlight>true</enableHighlight>\n" +
    "<samplingInterval>5</samplingInterval>\n" +
    "<startTriggerTime>1000</startTriggerTime>\n" +
    "<endTriggerTime>2000</endTriggerTime>\n" +
    "<regionType>grid</regionType>\n" +
    "<Grid>\n" +
    "<rowGranularity>18</rowGranularity>\n" +
    "<columnGranularity>22</columnGranularity>\n" +
    "</Grid>\n" +
    '<MotionDetectionLayout version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">\n' +
    "<sensitivityLevel>60</sensitivityLevel>\n" +
    "<layout>\n" +
    `<gridMap>${"fffffc".repeat(18)}</gridMap>\n` +
    "</layout>\n" +
    "<targetType>human,vehicle</targetType>\n" +
    "</MotionDetectionLayout>\n" +
    "</MotionDetection>\n";

  const motion = motionDetection({ channel: 1 }).codec.parse(xml);

  assertEquals(motion.enabled, true);
  assertEquals(motion.enableHighlight, true);
  assertEquals(motion.samplingIntervalFrames, 5);
  assertEquals(motion.startTriggerTimeMs, 1000);
  assertEquals(motion.endTriggerTimeMs, 2000);
  assertEquals(motion.regionType, "grid");
  assertEquals(motion.rows, 18);
  assertEquals(motion.columns, 22);
  assertEquals(motion.sensitivityLevel, 60);
  assertEquals(motion.targetType, ["human", "vehicle"]);
  assertEquals(motion.regions, undefined);
  assertEquals(motion.grid?.length, 18);
  assertEquals(
    motion.grid?.every((row) => row.length === 22 && row.every(Boolean)),
    true,
  );
});

Deno.test("motionDetection codec reads a gridMap and a RegionList side by side", () => {
  const xml =
    '<MotionDetection version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">' +
    "<enabled>true</enabled>" +
    "<regionType>grid</regionType>" +
    "<Grid><rowGranularity>2</rowGranularity><columnGranularity>8</columnGranularity></Grid>" +
    "<MotionDetectionLayout>" +
    "<sensitivityLevel>40</sensitivityLevel>" +
    "<layout>" +
    "<gridMap>f00f</gridMap>" +
    '<RegionList size="4">' +
    "<Region><id>1</id><RegionCoordinatesList>" +
    "<RegionCoordinates><positionX>0</positionX><positionY>0</positionY></RegionCoordinates>" +
    "<RegionCoordinates><positionX>500</positionX><positionY>0</positionY></RegionCoordinates>" +
    "<RegionCoordinates><positionX>500</positionX><positionY>500</positionY></RegionCoordinates>" +
    "<RegionCoordinates><positionX>0</positionX><positionY>500</positionY></RegionCoordinates>" +
    "</RegionCoordinatesList></Region>" +
    "<Region><id>2</id><RegionCoordinatesList>" +
    "<RegionCoordinates><positionX>500</positionX><positionY>500</positionY></RegionCoordinates>" +
    "<RegionCoordinates><positionX>1000</positionX><positionY>500</positionY></RegionCoordinates>" +
    "<RegionCoordinates><positionX>1000</positionX><positionY>1000</positionY></RegionCoordinates>" +
    "</RegionCoordinatesList></Region>" +
    "</RegionList>" +
    "</layout>" +
    "</MotionDetectionLayout>" +
    "</MotionDetection>";

  const motion = motionDetection({ channel: 1 }).codec.parse(xml);

  assertEquals(motion.grid, [
    [true, true, true, true, false, false, false, false],
    [false, false, false, false, true, true, true, true],
  ]);
  assertEquals(motion.regions, [
    {
      id: 1,
      coordinates: [
        { x: 0, y: 0 },
        { x: 500, y: 0 },
        { x: 500, y: 500 },
        { x: 0, y: 500 },
      ],
    },
    {
      id: 2,
      coordinates: [
        { x: 500, y: 500 },
        { x: 1000, y: 500 },
        { x: 1000, y: 1000 },
      ],
    },
  ]);
});

Deno.test("motionDetection codec reads a region-only document without a gridMap", () => {
  const xml = "<MotionDetection>" +
    "<enabled>true</enabled>" +
    "<regionType>region</regionType>" +
    "<MotionDetectionLayout>" +
    "<sensitivityLevel>80</sensitivityLevel>" +
    "<layout>" +
    "<RegionList>" +
    "<Region><id>1</id><RegionCoordinatesList>" +
    "<RegionCoordinates><positionX>100</positionX><positionY>200</positionY></RegionCoordinates>" +
    "<RegionCoordinates><positionX>900</positionX><positionY>200</positionY></RegionCoordinates>" +
    "<RegionCoordinates><positionX>500</positionX><positionY>800</positionY></RegionCoordinates>" +
    "</RegionCoordinatesList></Region>" +
    "</RegionList>" +
    "</layout>" +
    "<targetType>human</targetType>" +
    "</MotionDetectionLayout>" +
    "</MotionDetection>";

  assertEquals(motionDetection({ channel: 1 }).codec.parse(xml), {
    enabled: true,
    regionType: "region",
    sensitivityLevel: 80,
    targetType: ["human"],
    regions: [{
      id: 1,
      coordinates: [{ x: 100, y: 200 }, { x: 900, y: 200 }, { x: 500, y: 800 }],
    }],
  });
});

Deno.test("motionDetection codec leaves optional fields out when the device omits them", () => {
  const xml = "<MotionDetection><enabled>false</enabled>" +
    "<Grid><rowGranularity>1</rowGranularity><columnGranularity>8</columnGranularity></Grid>" +
    "<MotionDetectionLayout><layout><gridMap>ff</gridMap></layout></MotionDetectionLayout>" +
    "</MotionDetection>";

  assertEquals(motionDetection({ channel: 1 }).codec.parse(xml), {
    enabled: false,
    rows: 1,
    columns: 8,
    grid: [[true, true, true, true, true, true, true, true]],
  });
});

Deno.test("motionDetection codec leaves the grid out when the gridMap has no Grid to size it", () => {
  const xml = "<MotionDetection><enabled>true</enabled>" +
    "<MotionDetectionLayout><layout><gridMap>ff</gridMap></layout></MotionDetectionLayout>" +
    "</MotionDetection>";

  assertEquals(motionDetection({ channel: 1 }).codec.parse(xml), {
    enabled: true,
  });
});

Deno.test("motionDetection codec returns only enabled for a bare document", () => {
  assertEquals(
    motionDetection({ channel: 1 }).codec.parse(
      "<MotionDetection><regionType>none</regionType></MotionDetection>",
    ),
    { enabled: false, regionType: "none" },
  );
});

Deno.test("motionDetection codec drops an empty RegionList", () => {
  const xml = "<MotionDetection><enabled>true</enabled>" +
    "<Grid><rowGranularity>1</rowGranularity><columnGranularity>8</columnGranularity></Grid>" +
    "<MotionDetectionLayout><layout><gridMap>00</gridMap>" +
    '<RegionList size="4"/></layout></MotionDetectionLayout>' +
    "</MotionDetection>";

  const motion = motionDetection({ channel: 1 }).codec.parse(xml);

  assertEquals(motion.regions, undefined);
  assertEquals(motion.grid, [[
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]]);
});

Deno.test("request(motionDetection) requests the camera-side path when proxy is off", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<MotionDetection><enabled>true</enabled>" +
        "<Grid><rowGranularity>1</rowGranularity><columnGranularity>8</columnGranularity></Grid>" +
        "<MotionDetectionLayout><layout><gridMap>00</gridMap></layout></MotionDetectionLayout>" +
        "</MotionDetection>",
    ),
  ]));

  await request(
    {
      baseUrl: "http://192.0.2.21",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    motionDetection({ channel: 1 }),
  );

  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.21/ISAPI/System/Video/inputs/channels/1/motionDetection",
  );
});
