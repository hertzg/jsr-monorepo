import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { request } from "../request.ts";
import { IsapiError } from "../status/isapi-error.ts";
import { fieldDetection } from "./field-detection.ts";

test("fieldDetection reads the channel, screen size and every region", () => {
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

  assertEquals(fieldDetection().codec.parse(xml), {
    type: "FieldDetection",
    channel: 1,
    enabled: true,
    normalizedScreenSize: { width: 1000, height: 1000 },
    regions: [
      {
        id: 1,
        enabled: false,
        sensitivityLevel: 45,
        timeThresholdSec: 0,
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
        timeThresholdSec: 5,
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

test("fieldDetection reads misinfo filters at the root and per region, and detectionTarget all", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<FieldDetection version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>3</id>\n" +
    "<enabled>true</enabled>\n" +
    "<normalizedScreenSize>\n" +
    "<normalizedScreenWidth>1000</normalizedScreenWidth>\n" +
    "<normalizedScreenHeight>1000</normalizedScreenHeight>\n" +
    "</normalizedScreenSize>\n" +
    '<FieldDetectionRegionList size="1" >\n' +
    "<FieldDetectionRegion>\n" +
    "<id>1</id>\n" +
    "<enabled>true</enabled>\n" +
    "<sensitivityLevel>60</sensitivityLevel>\n" +
    "<timeThreshold>2</timeThreshold>\n" +
    "<objectOccupation>10</objectOccupation>\n" +
    "<RegionCoordinatesList>\n" +
    "<RegionCoordinates>\n<positionX>10</positionX>\n<positionY>20</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>990</positionX>\n<positionY>20</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>500</positionX>\n<positionY>980</positionY>\n</RegionCoordinates>\n" +
    "</RegionCoordinatesList>\n" +
    "<detectionTarget>all</detectionTarget>\n" +
    '<alarmConfidence opt="low,mediumLow,mediumHigh,high">mediumHigh</alarmConfidence>\n' +
    "<humanMisinfoFilterEnabled>true</humanMisinfoFilterEnabled>\n" +
    "<vehicleMisinfoFilterEnabled>false</vehicleMisinfoFilterEnabled>\n" +
    "</FieldDetectionRegion>\n" +
    "</FieldDetectionRegionList>\n" +
    "<isSupportMultiScene>false</isSupportMultiScene>\n" +
    "<isSupportHumanMisinfoFilter>true</isSupportHumanMisinfoFilter>\n" +
    "<isSupportVehicleMisinfoFilter>true</isSupportVehicleMisinfoFilter>\n" +
    "<humanMisinfoFilterEnabled>false</humanMisinfoFilterEnabled>\n" +
    "<vehicleMisinfoFilterEnabled>true</vehicleMisinfoFilterEnabled>\n" +
    "</FieldDetection>\n";

  assertEquals(fieldDetection().codec.parse(xml), {
    type: "FieldDetection",
    channel: 3,
    enabled: true,
    normalizedScreenSize: { width: 1000, height: 1000 },
    humanMisinfoFilterEnabled: false,
    vehicleMisinfoFilterEnabled: true,
    regions: [{
      id: 1,
      enabled: true,
      sensitivityLevel: 60,
      timeThresholdSec: 2,
      objectOccupationPercent: 10,
      coordinates: [{ x: 10, y: 20 }, { x: 990, y: 20 }, { x: 500, y: 980 }],
      detectionTarget: ["all"],
      alarmConfidence: "mediumHigh",
      humanMisinfoFilterEnabled: true,
      vehicleMisinfoFilterEnabled: false,
    }],
  });
});

test("fieldDetection throws IsapiError for a device without the feature", () => {
  assertThrows(
    () =>
      fieldDetection().codec.parse(
        "<ResponseStatus><requestURL>/ISAPI/Smart/FieldDetection/1</requestURL>" +
          "<statusCode>4</statusCode><statusString>Invalid Operation</statusString>" +
          "<subStatusCode>notSupport</subStatusCode></ResponseStatus>",
      ),
    IsapiError,
    "notSupport",
  );
});

test("fieldDetection puts the channel in the path", () => {
  assertEquals(
    fieldDetection({ channel: 2 }).path,
    "/ISAPI/Smart/FieldDetection/2",
  );
  assertEquals(fieldDetection().path, "/ISAPI/Smart/FieldDetection/1");
});

test("read requests a fieldDetection resource for the channel it is given", async () => {
  const fetch = spy(resolvesNext([
    new Response(
      "<FieldDetection><id>2</id><enabled>true</enabled></FieldDetection>",
    ),
  ]));

  const field = await request({
    baseUrl: "http://192.0.2.10",
    username: "admin",
    password: "hunter2",
    fetch,
  }, fieldDetection({ channel: 2 }));

  assertEquals(field.channel, 2);
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/Smart/FieldDetection/2",
  );
});
