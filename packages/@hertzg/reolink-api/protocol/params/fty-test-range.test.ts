import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ftyTestRange } from "./fty-test-range.ts";

Deno.test("ftyTestRange decodes every range the serializer writes", () => {
  const root = parse(
    '<ftyTestRange version="1.1">' +
      "<rangeQuantity><max>100</max><min>20</min></rangeQuantity>" +
      "<rangeTemperature><max>60</max><min>-10</min></rangeTemperature>" +
      "<rangeCds0FastAe><max>900</max><min>50</min></rangeCds0FastAe>" +
      "<rangeCds1CbwSwitch><max>800</max><min>40</min></rangeCds1CbwSwitch>" +
      "<rangeCurrent><max>500</max><min>100</min></rangeCurrent>" +
      "<rangeVoltage><max>4200</max><min>3300</min></rangeVoltage>" +
      "<rangeRebootTimes><max>30</max><min>10</min></rangeRebootTimes>" +
      "</ftyTestRange>",
  ).root;

  assertEquals(ftyTestRange.decode(root), {
    rangeQuantity: { max: 100, min: 20 },
    rangeTemperature: { max: 60, min: -10 },
    rangeCds0FastAe: { max: 900, min: 50 },
    rangeCds1CbwSwitch: { max: 800, min: 40 },
    rangeCurrent: { max: 500, min: 100 },
    rangeVoltage: { max: 4200, min: 3300 },
    rangeRebootTimes: { max: 30, min: 10 },
  });
});

Deno.test("ftyTestRange decodes a range with only one bound", () => {
  const root = parse(
    '<ftyTestRange version="1.1">' +
      "<rangeTemperature><min>-20</min></rangeTemperature></ftyTestRange>",
  ).root;

  assertEquals(ftyTestRange.decode(root), { rangeTemperature: { min: -20 } });
});

Deno.test("ftyTestRange writes max before min", () => {
  const xml = ftyTestRange.encode({ rangeQuantity: { min: 20, max: 100 } });

  assertEquals(
    xml,
    '<ftyTestRange version="1.1">' +
      "<rangeQuantity><max>100</max><min>20</min></rangeQuantity>" +
      "</ftyTestRange>",
  );
});

Deno.test("ftyTestRange round-trips through encode and decode", () => {
  const value = {
    rangeQuantity: { max: 99, min: 21 },
    rangeTemperature: { max: 55, min: -5 },
    rangeCds0FastAe: { max: 901, min: 51 },
    rangeCds1CbwSwitch: { max: 801, min: 41 },
    rangeCurrent: { max: 501, min: 101 },
    rangeVoltage: { max: 4100, min: 3400 },
    rangeRebootTimes: { max: 31, min: 11 },
  };

  const xml = ftyTestRange.encode(value);

  assertEquals(ftyTestRange.decode(parse(xml).root), value);
});
