import { assertEquals, assertThrows } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { IsapiError } from "../xml.ts";
import {
  lineDetectionPath,
  parseLineDetection,
  readLineDetection,
} from "./line-detection.ts";

Deno.test("parseLineDetection reads a document without a namespace and its lines", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    "<LineDetection>\n" +
    "<id>1</id>\n" +
    "<enabled>true</enabled>\n" +
    "<enableDualVca>true</enableDualVca>\n" +
    "<normalizedScreenSize>\n" +
    "<normalizedScreenWidth>1000</normalizedScreenWidth>\n" +
    "<normalizedScreenHeight>1000</normalizedScreenHeight>\n" +
    "</normalizedScreenSize>\n" +
    '<LineItemList size="1" >\n' +
    "<LineItem>\n" +
    "<id>1</id>\n" +
    "<enabled>false</enabled>\n" +
    "<sensitivityLevel>45</sensitivityLevel>\n" +
    "<directionSensitivity>any</directionSensitivity>\n" +
    "<CoordinatesList>\n" +
    "<Coordinates>\n<positionX>826</positionX>\n<positionY>767</positionY>\n</Coordinates>\n" +
    "<Coordinates>\n<positionX>880</positionX>\n<positionY>762</positionY>\n</Coordinates>\n" +
    "</CoordinatesList>\n" +
    "<detectionTarget>human,vehicle</detectionTarget>\n" +
    '<alarmConfidence opt="low,mediumLow,mediumHigh,high">low</alarmConfidence>\n' +
    "</LineItem>\n" +
    "</LineItemList>\n" +
    "<isSupportMultiScene>false</isSupportMultiScene>\n" +
    "<recogRuleType>vectorMode</recogRuleType>\n" +
    "</LineDetection>\n";

  assertEquals(parseLineDetection(xml), {
    channel: 1,
    enabled: true,
    normalizedScreenSize: { width: 1000, height: 1000 },
    lines: [{
      id: 1,
      enabled: false,
      sensitivityLevel: 45,
      directionSensitivity: "any",
      coordinates: [{ x: 826, y: 767 }, { x: 880, y: 762 }],
      detectionTarget: ["human", "vehicle"],
      alarmConfidence: "low",
    }],
  });
});

Deno.test("parseLineDetection reads a document without lines", () => {
  assertEquals(
    parseLineDetection(
      "<LineDetection><id>2</id><enabled>false</enabled></LineDetection>",
    ),
    { channel: 2, enabled: false, lines: [] },
  );
});

Deno.test("parseLineDetection throws IsapiError for a device without the feature", () => {
  assertThrows(
    () =>
      parseLineDetection(
        "<ResponseStatus><requestURL>/ISAPI/Smart/LineDetection/1</requestURL>" +
          "<statusCode>4</statusCode><statusString>Invalid Operation</statusString>" +
          "<subStatusCode>notSupport</subStatusCode></ResponseStatus>",
      ),
    IsapiError,
    "notSupport",
  );
});

Deno.test("lineDetectionPath puts the channel in the path", () => {
  assertEquals(lineDetectionPath(), "/ISAPI/Smart/LineDetection/1");
  assertEquals(lineDetectionPath(3), "/ISAPI/Smart/LineDetection/3");
});

Deno.test("readLineDetection requests the channel it is given", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<LineDetection><id>3</id><enabled>true</enabled></LineDetection>",
    ),
  ]));

  const line = await readLineDetection({
    baseUrl: "http://192.0.2.10",
    username: "admin",
    password: "hunter2",
    fetch,
  }, 3);

  assertEquals(line, { channel: 3, enabled: true, lines: [] });
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/Smart/LineDetection/3",
  );
});
