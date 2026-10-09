import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { binoAdjust } from "./bino-adjust.ts";

Deno.test("binoAdjust decodes every field nets_param_bino_adjust_x2s reads", () => {
  const root = parse(
    "<BinoAdjust><lineWidthRef>10</lineWidthRef><lineWidthMin>8</lineWidthMin>" +
      "<lineWidthMax>12</lineWidthMax><heightDiffMax>4</heightDiffMax>" +
      "</BinoAdjust>",
  ).root;

  assertEquals(binoAdjust.decode(root), {
    lineWidthRef: 10,
    lineWidthMin: 8,
    lineWidthMax: 12,
    heightDiffMax: 4,
  });
});

Deno.test("binoAdjust decodes the netserver reply", () => {
  const root = parse(
    '<BinoAdjust version="1.1"><heightDiff>2</heightDiff>' +
      "<widthDiff>5</widthDiff></BinoAdjust>",
  ).root;

  assertEquals(binoAdjust.decode(root), { heightDiff: 2, widthDiff: 5 });
});

Deno.test("binoAdjust round-trips through encode and decode", () => {
  const value = {
    lineWidthRef: 20,
    lineWidthMin: 16,
    lineWidthMax: 24,
    heightDiffMax: 6,
    heightDiff: 1,
    widthDiff: 3,
  };

  const xml = binoAdjust.encode(value);

  assertEquals(binoAdjust.decode(parse(xml).root), value);
});
