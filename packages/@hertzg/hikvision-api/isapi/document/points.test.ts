import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { points } from "./points.ts";

test("points reads pairs whatever the pair element is called", () => {
  const list = parse(
    "<CoordinatesList>" +
      "<Coordinates><positionX>826</positionX><positionY>767</positionY></Coordinates>" +
      "<RegionCoordinates><positionX>880</positionX><positionY>762</positionY></RegionCoordinates>" +
      "</CoordinatesList>",
  ).root;

  assertEquals(points().decode(list), [{ x: 826, y: 767 }, { x: 880, y: 762 }]);
});

test("points reads an empty list as no points", () => {
  assertEquals(points().decode(parse("<RegionCoordinatesList/>").root), []);
});

test("points throws when a pair lacks a coordinate", () => {
  const list = parse(
    "<L><RegionCoordinates><positionX>1</positionX></RegionCoordinates></L>",
  ).root;

  assertThrows(
    () => points().decode(list),
    Error,
    "ISAPI <RegionCoordinates> has no <positionY>",
  );
});
