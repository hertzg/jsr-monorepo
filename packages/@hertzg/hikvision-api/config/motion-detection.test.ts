import { assertEquals, assertThrows } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import {
  decodeGridMap,
  encodeGridMap,
  motionDetectionPath,
  parseMotionDetection,
  readMotionDetection,
} from "./motion-detection.ts";

Deno.test("motionDetectionPath picks the input proxy path for an NVR channel", () => {
  assertEquals(
    motionDetectionPath({ channel: 5, proxy: true }),
    "/ISAPI/ContentMgmt/InputProxy/channels/5/video/motionDetection",
  );
  assertEquals(
    motionDetectionPath({ channel: 1 }),
    "/ISAPI/System/Video/inputs/channels/1/motionDetection",
  );
});

Deno.test("decodeGridMap reads 22 columns from 24-bit rows, first column first", () => {
  const grid = decodeGridMap("800001" + "fffffc", 2, 22);

  assertEquals(grid[0][0], true);
  assertEquals(grid[0].slice(1).every((cell) => cell === false), true);
  assertEquals(grid[1].every((cell) => cell === true), true);
  assertEquals(grid[1].length, 22);
});

Deno.test("decodeGridMap pads a row to whole bytes", () => {
  assertEquals(decodeGridMap("0f", 1, 8), [[
    false,
    false,
    false,
    false,
    true,
    true,
    true,
    true,
  ]]);
  assertEquals(decodeGridMap("c0", 1, 2), [[true, true]]);
});

Deno.test("encodeGridMap writes rows padded to whole bytes, first column first", () => {
  const empty = Array.from({ length: 22 }, () => false);
  const top = [...empty];
  top[0] = true;
  const bottom = [...empty];
  bottom[21] = true;

  assertEquals(encodeGridMap([top, bottom]), "800000000004");
});

Deno.test("encodeGridMap round-trips the NVR default of every cell on", () => {
  const gridMap = "fffffc".repeat(18);

  assertEquals(encodeGridMap(decodeGridMap(gridMap, 18, 22)), gridMap);
});

Deno.test("parseMotionDetection reads an NVR's copy of a camera's settings", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<MotionDetection version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">\n' +
    "<enabled>true</enabled>\n" +
    "<enableHighlight>true</enableHighlight>\n" +
    "<samplingInterval>5</samplingInterval>\n" +
    "<startTriggerTime>1000</startTriggerTime>\n" +
    "<endTriggerTime>1000</endTriggerTime>\n" +
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

  const motion = parseMotionDetection(xml);

  assertEquals(motion.enabled, true);
  assertEquals(motion.regionType, "grid");
  assertEquals(motion.rows, 18);
  assertEquals(motion.columns, 22);
  assertEquals(motion.sensitivityLevel, 60);
  assertEquals(motion.targetType, ["human", "vehicle"]);
  assertEquals(motion.grid.length, 18);
  assertEquals(
    motion.grid.every((row) => row.length === 22 && row.every(Boolean)),
    true,
  );
});

Deno.test("parseMotionDetection leaves optional fields out when the device omits them", () => {
  const xml = "<MotionDetection><enabled>false</enabled>" +
    "<Grid><rowGranularity>1</rowGranularity><columnGranularity>8</columnGranularity></Grid>" +
    "<MotionDetectionLayout><layout><gridMap>ff</gridMap></layout></MotionDetectionLayout>" +
    "</MotionDetection>";

  assertEquals(parseMotionDetection(xml), {
    enabled: false,
    rows: 1,
    columns: 8,
    grid: [[true, true, true, true, true, true, true, true]],
  });
});

Deno.test("parseMotionDetection throws without a grid", () => {
  assertThrows(
    () =>
      parseMotionDetection(
        "<MotionDetection><enabled>true</enabled></MotionDetection>",
      ),
    Error,
    "<Grid>",
  );
});

Deno.test("readMotionDetection requests the camera-side path when proxy is off", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<MotionDetection><enabled>true</enabled>" +
        "<Grid><rowGranularity>1</rowGranularity><columnGranularity>8</columnGranularity></Grid>" +
        "<MotionDetectionLayout><layout><gridMap>00</gridMap></layout></MotionDetectionLayout>" +
        "</MotionDetection>",
    ),
  ]));

  await readMotionDetection(
    {
      baseUrl: "http://192.0.2.21",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    { channel: 1 },
  );

  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.21/ISAPI/System/Video/inputs/channels/1/motionDetection",
  );
});
