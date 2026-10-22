import { assertEquals, assertThrows } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { IsapiError } from "../status.ts";
import { read } from "../request.ts";
import { fieldDetection, SMART_RULE_TYPES, smartRules } from "./rules.ts";

Deno.test("fieldDetection reads the channel, screen size and every region", () => {
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

Deno.test("fieldDetection reads misinfo filters at the root and per region, and detectionTarget all", () => {
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

Deno.test("smartRules finds a regionEntrance list and regions by the root name", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<RegionEntrance version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<id>2</id>\n" +
    "<enabled>false</enabled>\n" +
    "<normalizedScreenSize>\n" +
    "<normalizedScreenWidth>1000</normalizedScreenWidth>\n" +
    "<normalizedScreenHeight>1000</normalizedScreenHeight>\n" +
    "</normalizedScreenSize>\n" +
    '<RegionEntranceRegionList size="4" >\n' +
    "<RegionEntranceRegion>\n" +
    "<id>1</id>\n" +
    "<enabled>true</enabled>\n" +
    "<sensitivityLevel>50</sensitivityLevel>\n" +
    "<RegionCoordinatesList>\n" +
    "<RegionCoordinates>\n<positionX>120</positionX>\n<positionY>130</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>880</positionX>\n<positionY>130</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>880</positionX>\n<positionY>870</positionY>\n</RegionCoordinates>\n" +
    "<RegionCoordinates>\n<positionX>120</positionX>\n<positionY>870</positionY>\n</RegionCoordinates>\n" +
    "</RegionCoordinatesList>\n" +
    "<detectionTarget>vehicle</detectionTarget>\n" +
    '<alarmConfidence opt="low,mediumLow,mediumHigh,high">high</alarmConfidence>\n' +
    "</RegionEntranceRegion>\n" +
    "<RegionEntranceRegion>\n" +
    "<id>2</id>\n" +
    "<enabled>false</enabled>\n" +
    "<sensitivityLevel>50</sensitivityLevel>\n" +
    "<RegionCoordinatesList>\n" +
    "</RegionCoordinatesList>\n" +
    "<detectionTarget>human,vehicle</detectionTarget>\n" +
    "</RegionEntranceRegion>\n" +
    "</RegionEntranceRegionList>\n" +
    "<isSupportMultiScene>false</isSupportMultiScene>\n" +
    "</RegionEntrance>\n";

  assertEquals(
    smartRules({ type: "regionEntrance", channel: 2 }).codec.parse(xml),
    {
      type: "RegionEntrance",
      channel: 2,
      enabled: false,
      normalizedScreenSize: { width: 1000, height: 1000 },
      regions: [
        {
          id: 1,
          enabled: true,
          sensitivityLevel: 50,
          coordinates: [{ x: 120, y: 130 }, { x: 880, y: 130 }, {
            x: 880,
            y: 870,
          }, { x: 120, y: 870 }],
          detectionTarget: ["vehicle"],
          alarmConfidence: "high",
        },
        {
          id: 2,
          enabled: false,
          sensitivityLevel: 50,
          coordinates: [],
          detectionTarget: ["human", "vehicle"],
        },
      ],
    },
  );
});

Deno.test("smartRules reads a document without regions", () => {
  assertEquals(
    smartRules({ type: "loitering" }).codec.parse(
      "<Loitering><id>5</id><enabled>false</enabled></Loitering>",
    ),
    { type: "Loitering", channel: 5, enabled: false, regions: [] },
  );
});

Deno.test("fieldDetection throws IsapiError for a device without the feature", () => {
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

Deno.test("smart rule resources put the type and the channel in the path", () => {
  assertEquals(
    smartRules({ type: "regionExiting", channel: 7 }).path,
    "/ISAPI/Smart/regionExiting/7",
  );
  assertEquals(
    smartRules({ type: "unattendedBaggage" }).path,
    "/ISAPI/Smart/unattendedBaggage/1",
  );
  assertEquals(
    smartRules({ type: "FieldDetection", channel: 2 }).path,
    "/ISAPI/Smart/FieldDetection/2",
  );
  assertEquals(
    fieldDetection({ channel: 2 }).path,
    "/ISAPI/Smart/FieldDetection/2",
  );
  assertEquals(fieldDetection().path, "/ISAPI/Smart/FieldDetection/1");
});

Deno.test("SMART_RULE_TYPES lowercases only the two detection event types", () => {
  assertEquals(SMART_RULE_TYPES.FieldDetection, "fielddetection");
  assertEquals(SMART_RULE_TYPES.LineDetection, "linedetection");
  assertEquals(SMART_RULE_TYPES.rapidMove, "rapidMove");
  assertEquals(SMART_RULE_TYPES.attendedBaggage, "attendedBaggage");
});

Deno.test("read requests smartRules and fieldDetection resources for the channel they are given", async () => {
  const fetch = spy(resolvesNext([
    new Response("<Parking><id>4</id><enabled>true</enabled></Parking>"),
    new Response("<Loitering><id>1</id><enabled>true</enabled></Loitering>"),
    new Response(
      "<FieldDetection><id>2</id><enabled>true</enabled></FieldDetection>",
    ),
  ]));
  const options = {
    baseUrl: "http://192.0.2.10",
    username: "admin",
    password: "hunter2",
    fetch,
  };

  const parking = await read(
    options,
    smartRules({ type: "parking", channel: 4 }),
  );
  const loitering = await read(options, smartRules({ type: "loitering" }));
  const field = await read(options, fieldDetection({ channel: 2 }));

  assertEquals(parking.type, "Parking");
  assertEquals(parking.channel, 4);
  assertEquals(loitering.channel, 1);
  assertEquals(field.channel, 2);
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/Smart/parking/4",
  );
  assertEquals(
    fetch.calls[1].args[0],
    "http://192.0.2.10/ISAPI/Smart/loitering/1",
  );
  assertEquals(
    fetch.calls[2].args[0],
    "http://192.0.2.10/ISAPI/Smart/FieldDetection/2",
  );
});
