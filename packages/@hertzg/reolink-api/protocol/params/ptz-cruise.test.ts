import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ptzCruise } from "./ptz-cruise.ts";

Deno.test("ptzCruise decodes the cmd 64 reply", () => {
  const root = parse(
    '<PtzCruise version="1.1"><channelId>0</channelId><cruiseList>' +
      "<cruise><patrolId>2</patrolId><enable>1</enable><starting>1</starting>" +
      "<name>name-yard</name><keyPosList>" +
      "<keyPos><keyPosId>0</keyPosId><presetId>4</presetId><speed>30</speed>" +
      "<dwellTime>5</dwellTime></keyPos>" +
      "<keyPos><keyPosId>1</keyPosId><presetId>6</presetId><speed>40</speed>" +
      "<dwellTime>8</dwellTime></keyPos>" +
      "</keyPosList></cruise></cruiseList></PtzCruise>",
  ).root;

  assertEquals(ptzCruise.decode(root), {
    channelId: 0,
    cruiseList: [{
      patrolId: 2,
      enable: 1,
      starting: 1,
      name: "name-yard",
      keyPosList: [
        { keyPosId: 0, presetId: 4, speed: 30, dwellTime: 5 },
        { keyPosId: 1, presetId: 6, speed: 40, dwellTime: 8 },
      ],
    }],
  });
});

Deno.test("ptzCruise round-trips through encode and decode", () => {
  const value = {
    channelId: 1,
    cruiseList: [{
      patrolId: 3,
      enable: 0,
      keyPosList: [{ keyPosId: 2, presetId: -1 }],
    }],
  };

  assertEquals(ptzCruise.decode(parse(ptzCruise.encode(value)).root), value);
});

Deno.test("ptzCruise throws on a key position without presetId", () => {
  const root = parse(
    "<PtzCruise><channelId>0</channelId><cruiseList><cruise>" +
      "<patrolId>0</patrolId><keyPosList><keyPos><keyPosId>0</keyPosId>" +
      "</keyPos></keyPosList></cruise></cruiseList></PtzCruise>",
  ).root;

  assertThrows(() => ptzCruise.decode(root), Error, "<presetId>");
});
