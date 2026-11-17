import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { answerEvent } from "./answer-event.ts";

test("answerEvent decodes a cmd 620 request", () => {
  const root = parse(
    '<answerEvent version="1.1"><startTime>1712345678</startTime></answerEvent>',
  ).root;

  assertEquals(answerEvent.decode(root), { startTime: 1712345678 });
});

test("answerEvent decodes an element without startTime", () => {
  const root = parse("<answerEvent></answerEvent>").root;

  assertEquals(answerEvent.decode(root), {});
});

test("answerEvent round-trips through encode and decode", () => {
  const value = { startTime: 1798765432 };

  assertEquals(
    answerEvent.decode(parse(answerEvent.encode(value)).root),
    value,
  );
});
