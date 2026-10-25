import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { test } from "node:test";
import { attributes } from "./attributes.ts";

test("attributes yields only the keys that are present", () => {
  const element = parse(
    '<sensitivityLevel min="0" max="100">40</sensitivityLevel>',
  ).root;

  const range = attributes({ min: Number, max: Number, step: Number });

  assertEquals(range.decode(element), { min: 0, max: 100 });
});

test("attributes yields an empty object when none are present", () => {
  const element = parse("<sensitivityLevel>40</sensitivityLevel>").root;

  assertEquals(attributes({ min: Number }).decode(element), {});
});
