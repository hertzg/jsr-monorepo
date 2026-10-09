import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { sleepState } from "./sleep-state.ts";

Deno.test("sleepState decodes the cmd 574 reply the firmware writes", () => {
  const root = parse('<sleepState version="1.1"><sleep>1</sleep></sleepState>')
    .root;

  assertEquals(sleepState.decode(root), { sleep: 1 });
});

Deno.test("sleepState decodes every field the cmd 575 parser accepts", () => {
  const root = parse(
    "<sleepState><operate>2</operate><sleep>0</sleep><mode>3</mode>" +
      "<panPos>40</panPos><tiltPos>50</tiltPos>" +
      "<imageName>image-abc</imageName></sleepState>",
  ).root;

  assertEquals(sleepState.decode(root), {
    operate: 2,
    sleep: 0,
    mode: 3,
    panPos: 40,
    tiltPos: 50,
    imageName: "image-abc",
  });
});

Deno.test("sleepState round-trips through encode and decode", () => {
  const value = { operate: 2, sleep: 1 };

  assertEquals(sleepState.decode(parse(sleepState.encode(value)).root), value);
});
