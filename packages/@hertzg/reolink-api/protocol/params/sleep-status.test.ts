import { assertEquals, assertThrows } from "@std/assert";
import { isElement, parse } from "@std/xml";
import { sleepStatus } from "./sleep-status.ts";

Deno.test("sleepStatus decodes a cmd 623 push captured from a doorbell", () => {
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    "<body>\n" +
    '<sleepStatus version="1.1">\n' +
    "<sleep>0</sleep>\n" +
    "</sleepStatus>\n" +
    "</body>\n";
  const [element] = parse(xml).root.children.filter(isElement);

  assertEquals(sleepStatus.decode(element), { sleep: 0 });
});

Deno.test("sleepStatus round-trips through encode and decode", () => {
  const value = { sleep: 1 };

  assertEquals(
    sleepStatus.decode(parse(sleepStatus.encode(value)).root),
    value,
  );
});

Deno.test("sleepStatus rejects a push without sleep", () => {
  const root = parse('<sleepStatus version="1.1"></sleepStatus>').root;

  assertThrows(() => sleepStatus.decode(root), Error, "<sleep>");
});
