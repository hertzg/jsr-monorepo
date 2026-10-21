import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import {
  element,
  elements,
  IsapiError,
  parseIsapi,
  parseResponseStatus,
  points,
  requireText,
  text,
  textOf,
  tokens,
} from "./xml.ts";

Deno.test("parseIsapi throws IsapiError with the status for a failing ResponseStatus", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<ResponseStatus version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\n' +
    "<requestURL>/ISAPI/Smart/FieldDetection/1</requestURL>\n" +
    "<statusCode>4</statusCode>\n" +
    "<statusString>Invalid Operation</statusString>\n" +
    "<subStatusCode>notSupport</subStatusCode>\n" +
    "</ResponseStatus>\n";

  const error = assertThrows(() => parseIsapi(xml), IsapiError);

  assertEquals(error.status, {
    requestURL: "/ISAPI/Smart/FieldDetection/1",
    statusCode: 4,
    statusString: "Invalid Operation",
    subStatusCode: "notSupport",
  });
});

Deno.test("parseIsapi returns a ResponseStatus whose statusCode is 1", () => {
  const xml = "<ResponseStatus><statusCode>1</statusCode>" +
    "<statusString>OK</statusString></ResponseStatus>";

  assertEquals(parseIsapi(xml).name.local, "ResponseStatus");
});

Deno.test("parseIsapi returns the root of any other document", () => {
  const xml = '<DeviceInfo xmlns="http://www.hikvision.com/ver20/XMLSchema">' +
    "<deviceType>NVR</deviceType></DeviceInfo>";

  assertEquals(parseIsapi(xml).name.local, "DeviceInfo");
});

Deno.test("parseResponseStatus reads a status without optional fields", () => {
  const root =
    parse("<ResponseStatus><statusCode>6</statusCode></ResponseStatus>").root;

  assertEquals(parseResponseStatus(root), {
    requestURL: undefined,
    statusCode: 6,
    statusString: undefined,
    subStatusCode: undefined,
  });
});

Deno.test("elements matches by local name regardless of namespace", () => {
  const root = parse(
    '<List xmlns="http://www.isapi.org/ver20/XMLSchema">' +
      "<Item><id>1</id></Item><Other/><Item><id>2</id></Item></List>",
  ).root;

  assertEquals(elements(root, "Item").map((item) => text(item, "id")), [
    "1",
    "2",
  ]);
});

Deno.test("element returns the first match or undefined", () => {
  const root = parse("<a><b>1</b><b>2</b></a>").root;

  assertEquals(textOf(element(root, "b")!), "1");
  assertEquals(element(root, "c"), undefined);
});

Deno.test("textOf joins text and CDATA children", () => {
  const root = parse("<name>Camera <![CDATA[<01>]]></name>").root;

  assertEquals(textOf(root), "Camera <01>");
});

Deno.test("requireText throws naming the parent and the missing child", () => {
  const root = parse("<DeviceInfo><model>X</model></DeviceInfo>").root;

  assertThrows(
    () => requireText(root, "firmwareVersion"),
    Error,
    "ISAPI <DeviceInfo> has no <firmwareVersion>",
  );
});

Deno.test("tokens trims items and drops empty ones", () => {
  assertEquals(tokens(" human , vehicle,,"), ["human", "vehicle"]);
  assertEquals(tokens(""), []);
});

Deno.test("points reads every pair under the list whatever the pair element is called", () => {
  const list = parse(
    "<RegionCoordinatesList>" +
      "<RegionCoordinates><positionX>654</positionX><positionY>792</positionY></RegionCoordinates>" +
      "<RegionCoordinates><positionX>435</positionX><positionY>714</positionY></RegionCoordinates>" +
      "</RegionCoordinatesList>",
  ).root;

  assertEquals(points(list), [{ x: 654, y: 792 }, { x: 435, y: 714 }]);
});
