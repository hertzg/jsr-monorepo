import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { bool } from "./bool.ts";

test("bool decodes true as true and anything else as false", () => {
  assertEquals(
    ["true", "false", "yes", ""].map((value) =>
      bool().decode(parse(`<a>${value}</a>`).root)
    ),
    [true, false, false, false],
  );
});
