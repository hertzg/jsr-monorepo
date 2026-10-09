import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import {
  float,
  int,
  list,
  obj,
  oneOf,
  optional,
  repeated,
  text,
  u64,
  uint,
  xmlParam,
} from "./xml.ts";

Deno.test("xmlParam writes version 1.1 and fields in declaration order", () => {
  const port = xmlParam("RtspPort", { rtspPort: int(), enable: int() });

  assertEquals(
    port.encode({ enable: 1, rtspPort: 554 }),
    '<RtspPort version="1.1"><rtspPort>554</rtspPort><enable>1</enable></RtspPort>',
  );
});

Deno.test("xmlParam round-trips every field kind", () => {
  const param = xmlParam("Everything", {
    signed: int(),
    unsigned: uint(),
    big: u64(),
    ratio: float(),
    name: text(),
    mode: oneOf("auto", "manual"),
    range: obj({ min: int(), max: int() }),
    presetList: list("preset", obj({ id: int() })),
    item: repeated(text()),
  });
  const value = {
    signed: -5,
    unsigned: 4294967295,
    big: 18446744073709551615n,
    ratio: 0.25,
    name: "Front <door> & yard",
    mode: "manual" as const,
    range: { min: 1, max: 64 },
    presetList: [{ id: 1 }, { id: 2 }],
    item: ["a", "b"],
  };

  assertEquals(param.decode(parse(param.encode(value)).root), value);
});

Deno.test("xmlParam reads fields in any order and ignores unknown ones", () => {
  const port = xmlParam("RtspPort", { rtspPort: int(), enable: int() });

  assertEquals(
    port.decode(
      parse(
        "<RtspPort><extra>x</extra><enable>0</enable><rtspPort>8554</rtspPort></RtspPort>",
      ).root,
    ),
    { rtspPort: 8554, enable: 0 },
  );
});

Deno.test("xmlParam throws on a missing required field", () => {
  const port = xmlParam("RtspPort", { rtspPort: int(), enable: int() });

  assertThrows(
    () => port.decode(parse("<RtspPort><enable>1</enable></RtspPort>").root),
    Error,
    "<RtspPort> has no <rtspPort>",
  );
});

Deno.test("optional fields are skipped when absent, both ways", () => {
  const port = xmlParam("RtmpPort", {
    rtmpPort: int(),
    enable: optional(int()),
  });

  assertEquals(
    port.encode({ rtmpPort: 1935 }),
    '<RtmpPort version="1.1"><rtmpPort>1935</rtmpPort></RtmpPort>',
  );
  assertEquals(
    port.decode(parse("<RtmpPort><rtmpPort>1935</rtmpPort></RtmpPort>").root),
    { rtmpPort: 1935 },
  );
});

Deno.test("repeated reads no elements as an empty array", () => {
  const events = xmlParam("AlarmEventList", {
    AlarmEvent: repeated(obj({ channelId: int() })),
  });

  assertEquals(events.decode(parse("<AlarmEventList/>").root), {
    AlarmEvent: [],
  });
});

Deno.test("int throws on text that is not a number", () => {
  assertThrows(
    () => int().decode("speed", parse("<p><speed>fast</speed></p>").root),
    Error,
    '<speed> is not a number: "fast"',
  );
});

Deno.test("int throws on an empty element", () => {
  assertThrows(
    () => int().decode("speed", parse("<p><speed/></p>").root),
    Error,
    "not a number",
  );
});

Deno.test("u64 throws on text that is not an integer", () => {
  assertThrows(
    () => u64().decode("size", parse("<p><size>1.5</size></p>").root),
    Error,
    '<size> is not an integer: "1.5"',
  );
});

Deno.test("oneOf throws on a value outside the list", () => {
  assertThrows(
    () =>
      oneOf("none", "odd", "even").decode(
        "parity",
        parse("<p><parity>mark</parity></p>").root,
      ),
    Error,
    '<parity> is "mark", expected one of none, odd, even',
  );
});

Deno.test("text keeps an empty element as an empty string", () => {
  assertEquals(text().decode("name", parse("<p><name/></p>").root), "");
});
