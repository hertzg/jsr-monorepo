import { assertEquals } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { read } from "../request.ts";
import { motionDetectionCapabilities } from "./motion-detection-capabilities.ts";

Deno.test("motionDetectionCapabilities path appends /capabilities to both paths", () => {
  assertEquals(
    motionDetectionCapabilities({ channel: 5, proxy: true }).path,
    "/ISAPI/ContentMgmt/InputProxy/channels/5/video/motionDetection/capabilities",
  );
  assertEquals(
    motionDetectionCapabilities({ channel: 1 }).path,
    "/ISAPI/System/Video/inputs/channels/1/motionDetection/capabilities",
  );
});

Deno.test("motionDetectionCapabilities codec reads ranges from attributes", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<MotionDetection version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">\n' +
    '<enabled opt="true,false">true</enabled>\n' +
    '<enableHighlight opt="true,false">true</enableHighlight>\n' +
    '<samplingInterval min="1" max="10">2</samplingInterval>\n' +
    '<regionType opt="grid,region">grid</regionType>\n' +
    "<Grid>\n" +
    "<rowGranularity>18</rowGranularity>\n" +
    "<columnGranularity>22</columnGranularity>\n" +
    "</Grid>\n" +
    '<MotionDetectionLayout version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">\n' +
    '<sensitivityLevel min="0" max="100" step="20">60</sensitivityLevel>\n' +
    '<targetType opt="human,vehicle">human,vehicle</targetType>\n' +
    "</MotionDetectionLayout>\n" +
    '<regionEdgesNum min="4" max="10"/>\n' +
    "</MotionDetection>\n";

  assertEquals(motionDetectionCapabilities({ channel: 1 }).codec.parse(xml), {
    regionTypes: ["grid", "region"],
    rows: 18,
    columns: 22,
    sensitivityLevel: { min: 0, max: 100, step: 20 },
    targetTypes: ["human", "vehicle"],
    regionEdges: { min: 4, max: 10 },
  });
});

Deno.test("motionDetectionCapabilities codec leaves optional ranges out", () => {
  const xml = "<MotionDetection>" +
    '<regionType opt="grid">grid</regionType>' +
    '<MotionDetectionLayout><sensitivityLevel min="0" max="100">60</sensitivityLevel>' +
    "</MotionDetectionLayout>" +
    "</MotionDetection>";

  assertEquals(motionDetectionCapabilities({ channel: 1 }).codec.parse(xml), {
    regionTypes: ["grid"],
    sensitivityLevel: { min: 0, max: 100 },
    targetTypes: [],
  });
});

Deno.test("motionDetectionCapabilities codec finds sensitivity and targets at the root without a layout", () => {
  const xml = "<MotionDetection>" +
    '<regionType opt="grid">grid</regionType>' +
    '<sensitivityLevel min="0" max="100" step="20">60</sensitivityLevel>' +
    '<targetType opt="human">human</targetType>' +
    "</MotionDetection>";

  assertEquals(motionDetectionCapabilities({ channel: 1 }).codec.parse(xml), {
    regionTypes: ["grid"],
    sensitivityLevel: { min: 0, max: 100, step: 20 },
    targetTypes: ["human"],
  });
});

Deno.test("read(motionDetectionCapabilities) requests the proxy capabilities path", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      '<MotionDetection><regionType opt="grid,region">grid</regionType>' +
        "<Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>" +
        "</MotionDetection>",
    ),
  ]));

  const capabilities = await read(
    {
      baseUrl: "http://192.0.2.10",
      username: "admin",
      password: "hunter2",
      fetch,
    },
    motionDetectionCapabilities({ channel: 3, proxy: true }),
  );

  assertEquals(capabilities.regionTypes, ["grid", "region"]);
  assertEquals(capabilities.columns, 22);
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/3/video/motionDetection/capabilities",
  );
});
