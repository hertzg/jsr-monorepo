import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { afLearnRes } from "./af-learn-res.ts";

Deno.test("afLearnRes decodes every field the serializer writes", () => {
  const root = parse(
    '<AfLearnRes version="1.1"><zoomPos>120</zoomPos><focusPos>340</focusPos>' +
      "<rangeMin>10</rangeMin><rangeMax>900</rangeMax>" +
      "<afStudyState>2</afStudyState><afStudyRusult>1</afStudyRusult>" +
      "<backLashz>4</backLashz><backLashf>6</backLashf></AfLearnRes>",
  ).root;

  assertEquals(afLearnRes.decode(root), {
    zoomPos: 120,
    focusPos: 340,
    rangeMin: 10,
    rangeMax: 900,
    afStudyState: 2,
    afStudyRusult: 1,
    backLashz: 4,
    backLashf: 6,
  });
});

Deno.test("afLearnRes decodes an element with only some fields", () => {
  const root = parse(
    '<AfLearnRes version="1.1"><backLashf>6</backLashf></AfLearnRes>',
  ).root;

  assertEquals(afLearnRes.decode(root), { backLashf: 6 });
});

Deno.test("afLearnRes writes fields in serializer order", () => {
  const xml = afLearnRes.encode({
    zoomPos: 1,
    focusPos: 2,
    rangeMin: 3,
    rangeMax: 4,
    afStudyState: 5,
    afStudyRusult: 6,
    backLashz: 7,
    backLashf: 8,
  });

  assertEquals(
    xml,
    '<AfLearnRes version="1.1"><zoomPos>1</zoomPos><focusPos>2</focusPos>' +
      "<rangeMin>3</rangeMin><rangeMax>4</rangeMax>" +
      "<afStudyState>5</afStudyState><afStudyRusult>6</afStudyRusult>" +
      "<backLashz>7</backLashz><backLashf>8</backLashf></AfLearnRes>",
  );
});

Deno.test("afLearnRes round-trips through encode and decode", () => {
  const value = {
    zoomPos: 121,
    focusPos: 341,
    rangeMin: 11,
    rangeMax: 901,
    afStudyState: 3,
    afStudyRusult: 0,
    backLashz: 5,
    backLashf: 9,
  };

  const xml = afLearnRes.encode(value);

  assertEquals(afLearnRes.decode(parse(xml).root), value);
});
