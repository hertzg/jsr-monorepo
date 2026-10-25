import { assertEquals, assertThrows } from "@std/assert";
import { test } from "node:test";
import { IsapiError } from "../status/isapi-error.ts";
import { defineDocument } from "./define-document.ts";

test("defineDocument.decode hands the root to the function", () => {
  const codec = defineDocument((root) => root.name.local);

  assertEquals(codec.parse("<Loitering/>"), "Loitering");
});

test("defineDocument.parse throws IsapiError on a failing ResponseStatus body", () => {
  const codec = defineDocument((root) => root.name.local);
  const xml = "<ResponseStatus><statusCode>4</statusCode>" +
    "<subStatusCode>notSupport</subStatusCode></ResponseStatus>";

  assertThrows(() => codec.parse(xml), IsapiError, "notSupport");
});

test("defineDocument.map transforms what the document reads", () => {
  const codec = defineDocument((root) => root.name.local).map((name) =>
    name.toLowerCase()
  );

  assertEquals(codec.parse("<Loitering/>"), "loitering");
});
