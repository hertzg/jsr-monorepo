import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { children } from "../document/children.ts";
import { screenSize } from "./screen-size.ts";

test("screenSize reads a non-default width and height", () => {
  const root = parse(
    "<Rule><normalizedScreenSize>" +
      "<normalizedScreenWidth>640</normalizedScreenWidth>" +
      "<normalizedScreenHeight>480</normalizedScreenHeight>" +
      "</normalizedScreenSize></Rule>",
  ).root;

  assertEquals(
    screenSize.decode(children(root, "normalizedScreenSize")[0]),
    { width: 640, height: 480 },
  );
});
