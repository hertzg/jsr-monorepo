import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { document } from "../document/document.ts";
import { misinfoFilterFields } from "./misinfo-filter-fields.ts";

test("misinfoFilterFields reads both flags and leaves absent ones out", () => {
  const flags = document(misinfoFilterFields);

  assertEquals(
    flags.parse(
      "<Root><humanMisinfoFilterEnabled>false</humanMisinfoFilterEnabled>" +
        "<vehicleMisinfoFilterEnabled>true</vehicleMisinfoFilterEnabled></Root>",
    ),
    { humanMisinfoFilterEnabled: false, vehicleMisinfoFilterEnabled: true },
  );
  assertEquals(flags.parse("<Root/>"), {});
});
