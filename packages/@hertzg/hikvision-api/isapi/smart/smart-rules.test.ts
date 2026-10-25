import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { resolvesNext, spy } from "@std/testing/mock";
import { request } from "../request.ts";
import { smartRules } from "./smart-rules.ts";

test("smartRules finds a regionEntrance list and regions by the root name", () => {
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

test("smartRules reads a document without regions", () => {
  assertEquals(
    smartRules({ type: "loitering" }).codec.parse(
      "<Loitering><id>5</id><enabled>false</enabled></Loitering>",
    ),
    { type: "Loitering", channel: 5, enabled: false, regions: [] },
  );
});

test("smart rule resources put the type and the channel in the path", () => {
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
});

test("read requests smartRules resources for the channel they are given", async () => {
  const fetch = spy(resolvesNext([
    new Response("<Parking><id>4</id><enabled>true</enabled></Parking>"),
    new Response("<Loitering><id>1</id><enabled>true</enabled></Loitering>"),
  ]));
  const options = {
    baseUrl: "http://192.0.2.10",
    username: "admin",
    password: "hunter2",
    fetch,
  };

  const parking = await request(
    options,
    smartRules({ type: "parking", channel: 4 }),
  );
  const loitering = await request(options, smartRules({ type: "loitering" }));

  assertEquals(parking.type, "Parking");
  assertEquals(parking.channel, 4);
  assertEquals(loitering.channel, 1);
  assertEquals(
    fetch.calls[0].args[0],
    "http://192.0.2.10/ISAPI/Smart/parking/4",
  );
  assertEquals(
    fetch.calls[1].args[0],
    "http://192.0.2.10/ISAPI/Smart/loitering/1",
  );
});
