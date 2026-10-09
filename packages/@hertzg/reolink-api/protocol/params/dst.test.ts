import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dst } from "./dst.ts";

Deno.test("dst decodes the element the firmware writes", () => {
  const root = parse(
    '<Dst version="1.1"><enable>1</enable><offset>2</offset>' +
      "<startMonth>3</startMonth><startWeekIndex>4</startWeekIndex>" +
      "<startWeekday>Monday</startWeekday><startHour>5</startHour>" +
      "<startMinute>6</startMinute><startSecond>7</startSecond>" +
      "<endMonth>11</endMonth><endWeekIndex>1</endWeekIndex>" +
      "<endWeekday>Friday</endWeekday><endHour>8</endHour>" +
      "<endMinute>9</endMinute><endSecond>10</endSecond><version>12</version></Dst>",
  ).root;

  assertEquals(dst.decode(root), {
    enable: 1,
    offset: 2,
    startMonth: 3,
    startWeekIndex: 4,
    startWeekday: "Monday",
    startHour: 5,
    startMinute: 6,
    startSecond: 7,
    endMonth: 11,
    endWeekIndex: 1,
    endWeekday: "Friday",
    endHour: 8,
    endMinute: 9,
    endSecond: 10,
    version: 12,
  });
});

Deno.test("dst round-trips through encode and decode", () => {
  const value = {
    enable: 0,
    offset: 1,
    startMonth: 4,
    startWeekIndex: 2,
    startWeekday: "Saturday" as const,
    startHour: 1,
    startMinute: 30,
    startSecond: 15,
    endMonth: 9,
    endWeekIndex: 3,
    endWeekday: "Tuesday" as const,
    endHour: 22,
    endMinute: 45,
    endSecond: 50,
    version: 3,
  };

  assertEquals(dst.decode(parse(dst.encode(value)).root), value);
});

Deno.test("dst writes the version child next to the version attribute", () => {
  assertStringIncludes(
    dst.encode({ version: 5 }),
    '<Dst version="1.1"><version>5</version></Dst>',
  );
});

Deno.test("dst rejects a weekday the firmware never writes", () => {
  const root = parse('<Dst version="1.1"><endWeekday>sun</endWeekday></Dst>')
    .root;

  assertThrows(() => dst.decode(root), Error, '"sun"');
});
