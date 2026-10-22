import { assertEquals, assertThrows } from "@std/assert";
import { alertStream, parseAlert } from "./alert.ts";

Deno.test("parseAlert reads an NVR motion alert, channel from dynChannelID", () => {
  const xml =
    '<EventNotificationAlert version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<ipAddress>192.0.2.10</ipAddress>\n" +
    "<portNo>80</portNo>\n" +
    "<protocol>HTTP</protocol>\n" +
    "<macAddress>02:00:00:00:00:01</macAddress>\n" +
    "<dynChannelID>7</dynChannelID>\n" +
    "<dateTime>2026-10-21T20:44:39</dateTime>\n" +
    "<activePostCount>1</activePostCount>\n" +
    "<eventType>VMD</eventType>\n" +
    "<eventState>active</eventState>\n" +
    "<eventDescription>Motion alarm</eventDescription>\n" +
    "</EventNotificationAlert>\n";

  assertEquals(parseAlert(xml, "2026-10-21T16:44:39.512Z"), {
    channel: 7,
    eventType: "VMD",
    eventState: "active",
    eventDescription: "Motion alarm",
    dateTime: "2026-10-21T20:44:39",
    at: "2026-10-21T16:44:39.512Z",
    activePostCount: 1,
    ipAddress: "192.0.2.10",
    macAddress: "02:00:00:00:00:01",
  });
});

Deno.test("parseAlert reads the NVR heartbeat as channel 0 videoloss inactive", () => {
  const xml = "<EventNotificationAlert>" +
    "<channelID>0</channelID><dateTime>2026-10-21T20:44:28</dateTime>" +
    "<activePostCount>0</activePostCount><eventType>videoloss</eventType>" +
    "<eventState>inactive</eventState><eventDescription>videoloss alarm</eventDescription>" +
    "</EventNotificationAlert>";

  const alert = parseAlert(xml, "2026-10-21T16:44:28.100Z");

  assertEquals(alert.channel, 0);
  assertEquals(alert.eventType, "videoloss");
  assertEquals(alert.eventState, "inactive");
  assertEquals(alert.activePostCount, 0);
});

Deno.test("parseAlert reads a camera alert with channel name, zone and ipv6", () => {
  const xml =
    '<EventNotificationAlert version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<ipAddress>192.0.2.21</ipAddress>\n" +
    "<ipv6Address>::</ipv6Address>\n" +
    "<portNo>80</portNo>\n" +
    "<protocol>HTTP</protocol>\n" +
    "<macAddress>02:00:00:00:00:02</macAddress>\n" +
    "<channelID>1</channelID>\n" +
    "<dateTime>2026-10-21T20:44:20+04:00</dateTime>\n" +
    "<activePostCount>1</activePostCount>\n" +
    "<eventType>videoloss</eventType>\n" +
    "<eventState>inactive</eventState>\n" +
    "<eventDescription>videoloss alarm</eventDescription>\n" +
    "<channelName>Camera 01</channelName>\n" +
    "</EventNotificationAlert>\n";

  const alert = parseAlert(xml, "2026-10-21T16:44:20.004Z");

  assertEquals(alert.channel, 1);
  assertEquals(alert.channelName, "Camera 01");
  assertEquals(alert.dateTime, "2026-10-21T20:44:20+04:00");
});

Deno.test("parseAlert prefers dynChannelID when both channel ids are present", () => {
  const xml =
    "<EventNotificationAlert><channelID>0</channelID><dynChannelID>3</dynChannelID>" +
    "<eventType>VMD</eventType></EventNotificationAlert>";

  assertEquals(parseAlert(xml, "2026-10-21T16:44:20.004Z").channel, 3);
});

Deno.test("parseAlert defaults the channel to 0, the state to active and dateTime to empty", () => {
  const xml =
    "<EventNotificationAlert><eventType>diskfull</eventType></EventNotificationAlert>";

  assertEquals(parseAlert(xml, "2026-10-21T16:44:20.004Z"), {
    channel: 0,
    eventType: "diskfull",
    eventState: "active",
    dateTime: "",
    at: "2026-10-21T16:44:20.004Z",
  });
});

Deno.test("parseAlert reads the regions of a smart event", () => {
  const xml = "<EventNotificationAlert><dynChannelID>2</dynChannelID>" +
    "<eventType>fielddetection</eventType><eventState>active</eventState>" +
    "<DetectionRegionList><DetectionRegionEntry><regionID>1</regionID>" +
    "<sensitivityLevel>45</sensitivityLevel><RegionCoordinatesList>" +
    "<RegionCoordinates><positionX>654</positionX><positionY>792</positionY></RegionCoordinates>" +
    "<RegionCoordinates><positionX>435</positionX><positionY>714</positionY></RegionCoordinates>" +
    "</RegionCoordinatesList><detectionTarget>human</detectionTarget>" +
    "</DetectionRegionEntry></DetectionRegionList></EventNotificationAlert>";

  assertEquals(parseAlert(xml, "2026-10-21T16:44:20.004Z").regions, [{
    id: 1,
    sensitivityLevel: 45,
    coordinates: [{ x: 654, y: 792 }, { x: 435, y: 714 }],
    detectionTarget: ["human"],
  }]);
});

Deno.test("parseAlert reads an NVR smart alert with a TargetRect and an empty coordinate list", () => {
  const xml =
    '<EventNotificationAlert version="1.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<ipAddress>192.0.2.10</ipAddress>\n" +
    "<portNo>80</portNo>\n" +
    "<protocol>HTTP</protocol>\n" +
    "<macAddress>02:00:00:00:00:01</macAddress>\n" +
    "<dynChannelID>3</dynChannelID>\n" +
    "<dateTime>2026-10-21T21:02:11</dateTime>\n" +
    "<activePostCount>1</activePostCount>\n" +
    "<eventType>fielddetection</eventType>\n" +
    "<eventState>active</eventState>\n" +
    "<eventDescription>fielddetection alarm</eventDescription>\n" +
    "<DetectionRegionList>\n" +
    "<DetectionRegionEntry>\n" +
    "<regionID>0</regionID>\n" +
    "<RegionCoordinatesList>\n" +
    "</RegionCoordinatesList>\n" +
    "<TargetRect>\n" +
    "<X>412</X>\n" +
    "<Y>268</Y>\n" +
    "<width>95</width>\n" +
    "<height>230</height>\n" +
    "</TargetRect>\n" +
    "<detectionTarget>human</detectionTarget>\n" +
    "</DetectionRegionEntry>\n" +
    "</DetectionRegionList>\n" +
    "</EventNotificationAlert>\n";

  assertEquals(parseAlert(xml, "2026-10-21T17:02:11.330Z"), {
    channel: 3,
    eventType: "fielddetection",
    eventState: "active",
    eventDescription: "fielddetection alarm",
    dateTime: "2026-10-21T21:02:11",
    at: "2026-10-21T17:02:11.330Z",
    activePostCount: 1,
    ipAddress: "192.0.2.10",
    macAddress: "02:00:00:00:00:01",
    regions: [{
      id: 0,
      coordinates: [],
      detectionTarget: ["human"],
      targetRect: { x: 412, y: 268, width: 95, height: 230 },
    }],
  });
});

Deno.test("parseAlert reads a smart event going inactive", () => {
  const xml = "<EventNotificationAlert><dynChannelID>3</dynChannelID>" +
    "<eventType>linedetection</eventType><eventState>inactive</eventState>" +
    "</EventNotificationAlert>";

  const alert = parseAlert(xml, "2026-10-21T17:02:15.000Z");

  assertEquals(alert.eventType, "linedetection");
  assertEquals(alert.eventState, "inactive");
});

Deno.test("parseAlert throws when there is no eventType", () => {
  assertThrows(
    () =>
      parseAlert(
        "<EventNotificationAlert><channelID>1</channelID></EventNotificationAlert>",
        "x",
      ),
    Error,
    "<eventType>",
  );
});

Deno.test("alertStream stamps each alert with the time it was decoded", () => {
  const before = Date.now();

  const alert = alertStream.codec.parse(
    "<EventNotificationAlert><eventType>VMD</eventType></EventNotificationAlert>",
  );

  const at = Date.parse(alert.at);
  assertEquals(at >= before && at <= Date.now(), true);
});
