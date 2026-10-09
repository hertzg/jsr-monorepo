import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ftyAudioTest } from "./fty-audio-test.ts";

Deno.test("ftyAudioTest decodes every field the parser reads", () => {
  const root = parse(
    '<ftyAudioTest version="1.1"><ratedPower>80</ratedPower>' +
      "<difPower>5</difPower><difHz>20</difHz><difZero>3</difZero>" +
      "<difCrest>6</difCrest><difSame>2</difSame><difFreq>50</difFreq>" +
      "<flitFreq>1000</flitFreq></ftyAudioTest>",
  ).root;

  assertEquals(ftyAudioTest.decode(root), {
    ratedPower: 80,
    difPower: 5,
    difHz: 20,
    difZero: 3,
    difCrest: 6,
    difSame: 2,
    difFreq: 50,
    flitFreq: 1000,
  });
});

Deno.test("ftyAudioTest decodes an element with only some fields", () => {
  const root = parse(
    '<ftyAudioTest version="1.1"><difHz>20</difHz></ftyAudioTest>',
  ).root;

  assertEquals(ftyAudioTest.decode(root), { difHz: 20 });
});

Deno.test("ftyAudioTest round-trips through encode and decode", () => {
  const value = {
    ratedPower: 81,
    difPower: 4,
    difHz: 21,
    difZero: 1,
    difCrest: 7,
    difSame: 9,
    difFreq: 55,
    flitFreq: 2000,
  };

  const xml = ftyAudioTest.encode(value);

  assertEquals(ftyAudioTest.decode(parse(xml).root), value);
});
