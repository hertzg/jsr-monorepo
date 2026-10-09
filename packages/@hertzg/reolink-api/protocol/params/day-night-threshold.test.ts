import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { dayNightThreshold } from "./day-night-threshold.ts";

Deno.test("dayNightThreshold decodes what nets_param_day_night_threshold_s2x writes", () => {
  const root = parse(
    '<DayNightThreshold version="1.1"><channelId>0</channelId>' +
      "<threshold>custom</threshold><stat>night</stat>" +
      "<thresholdval><min>5</min><max>95</max><cur>40</cur></thresholdval>" +
      "</DayNightThreshold>",
  ).root;

  assertEquals(dayNightThreshold.decode(root), {
    channelId: 0,
    threshold: "custom",
    stat: "night",
    thresholdval: { min: 5, max: 95, cur: 40 },
  });
});

Deno.test("dayNightThreshold round-trips every field", () => {
  const value = {
    channelId: 1,
    threshold: "default" as const,
    stat: "day" as const,
    thresholdval: { min: 1, max: 99, cur: 50 },
  };

  assertEquals(
    dayNightThreshold.decode(parse(dayNightThreshold.encode(value)).root),
    value,
  );
});

Deno.test("dayNightThreshold throws on a threshold name the firmware does not map", () => {
  const root = parse(
    '<DayNightThreshold version="1.1"><threshold>auto</threshold></DayNightThreshold>',
  ).root;

  assertThrows(() => dayNightThreshold.decode(root), Error, "auto");
});

Deno.test("dayNightThreshold throws on a stat name the firmware does not map", () => {
  const root = parse(
    '<DayNightThreshold version="1.1"><stat>dusk</stat></DayNightThreshold>',
  ).root;

  assertThrows(() => dayNightThreshold.decode(root), Error, "dusk");
});
