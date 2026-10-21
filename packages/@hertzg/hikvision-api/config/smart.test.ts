import { assertEquals, assertThrows } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { IsapiError } from "../xml.ts";
import {
  parseFieldDetection,
  parseLineDetection,
  readFieldDetection,
  readLineDetection,
} from "./smart.ts";

Deno.test("parseFieldDetection reads the rule set, screen size and every region", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<FieldDetection version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>1</id>\n" +
    "<enabled>true</enabled>\n" +
    "<enableDualVca>true</enableDualVca>\n" +
    "<startTriggerTime>500</startTriggerTime>\n" +
    "<endTriggerTime>500</endTriggerTime>\n" +
    "<normalizedScreenSize>\n" +
    "<normalizedScreenWidth>1000</normalizedScreenWidth>\n" +
    "<normalizedScreenHeight>1000</normalizedScreenHeight>\n" +
    "</normalizedScreenSize>\n" +
    '<FieldDetectionRegionList size="2" >\n' +
    '<FieldDetectionRegion version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>1</id>\n" +
    "<enabled>false</enabled>\n" +
    "<sensitivityLevel>45</sensitivityLevel>\n" +
    "<timeThreshold>0</timeThreshold>\n" +
    "<RegionCoordinatesList>\n" +
    "<RegionCoordinates>\n<positionX>0</positionX>\n<positionY>0</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>1000</positionX>\n<positionY>0</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>1000</positionX>\n<positionY>1000</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>0</positionX>\n<positionY>1000</positionY>\n</RegionCoordinates>\n" +
    "</RegionCoordinatesList>\n" +
    "<detectionTarget>human</detectionTarget>\n" +
    '<alarmConfidence opt="low,mediumLow,mediumHigh,high">low</alarmConfidence>\n' +
    "</FieldDetectionRegion>\n" +
    '<FieldDetectionRegion version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>2</id>\n" +
    "<enabled>true</enabled>\n" +
    "<sensitivityLevel>80</sensitivityLevel>\n" +
    "<timeThreshold>5</timeThreshold>\n" +
    "<RegionCoordinatesList>\n" +
    "<RegionCoordinates>\n<positionX>100</positionX>\n<positionY>100</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>200</positionX>\n<positionY>100</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>150</positionX>\n<positionY>200</positionY>\n</RegionCoordinates>\n" +
    "</RegionCoordinatesList>\n" +
    "<detectionTarget>human,vehicle</detectionTarget>\n" +
    '<alarmConfidence opt="low,mediumLow,mediumHigh,high">high</alarmConfidence>\n' +
    "</FieldDetectionRegion>\n" +
    "</FieldDetectionRegionList>\n" +
    "<isSupportMultiScene>false</isSupportMultiScene>\n" +
    "</FieldDetection>\n";

  assertEquals(parseFieldDetection(xml), {
    id: 1,
    enabled: true,
    normalizedScreenSize: { width: 1000, height: 1000 },
    regions: [
      {
        id: 1,
        enabled: false,
        sensitivityLevel: 45,
        timeThreshold: 0,
        coordinates: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, {
          x: 0,
          y: 1000,
        }],
        detectionTarget: ["human"],
        alarmConfidence: "low",
      },
      {
        id: 2,
        enabled: true,
        sensitivityLevel: 80,
        timeThreshold: 5,
        coordinates: [{ x: 100, y: 100 }, { x: 200, y: 100 }, {
          x: 150,
          y: 200,
        }],
        detectionTarget: ["human", "vehicle"],
        alarmConfidence: "high",
      },
    ],
  });
});

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
    id: 1,
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

Deno.test("parseFieldDetection throws IsapiError for a device without the feature", () => {
  assertThrows(
    () =>
      parseFieldDetection(
        "<ResponseStatus><requestURL>/ISAPI/Smart/FieldDetection/1</requestURL>" +
          "<statusCode>4</statusCode><statusString>Invalid Operation</statusString>" +
          "<subStatusCode>notSupport</subStatusCode></ResponseStatus>",
      ),
    IsapiError,
    "notSupport",
  );
});

Deno.test("readFieldDetection and readLineDetection request the rule set they are given", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<FieldDetection><id>2</id><enabled>true</enabled></FieldDetection>",
    ),
    new Response(
      "<LineDetection><id>3</id><enabled>true</enabled></LineDetection>",
    ),
  ]));
  const options = {
    baseUrl: "http://192.0.2.21",
    username: "admin",
    password: "hunter2",
    fetch,
  };

  const field = await readFieldDetection(options, 2);
  const line = await readLineDetection(options, 3);

  assertEquals(field.id, 2);
  assertEquals(line.id, 3);
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.21/ISAPI/Smart/FieldDetection/2",
  );
  assertEquals(
    fetch.calls[1].args[0],
    "http://192.0.2.21/ISAPI/Smart/LineDetection/3",
  );
});
