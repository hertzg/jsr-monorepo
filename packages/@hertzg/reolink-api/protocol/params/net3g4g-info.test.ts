import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { net3g4gInfo } from "./net3g4g-info.ts";

Deno.test("net3g4gInfo decodes the cmd 255 push nets_4g_net_info_report writes", () => {
  const root = parse(
    '<Net3g4gInfo version="1.1"><sigIntensityLevel>3</sigIntensityLevel>' +
      "<sigIntensityValue>-83</sigIntensityValue><netMode>5</netMode>" +
      "<mobileOperator>7</mobileOperator></Net3g4gInfo>",
  ).root;

  assertEquals(net3g4gInfo.decode(root), {
    sigIntensityLevel: 3,
    sigIntensityValue: -83,
    netMode: 5,
    mobileOperator: 7,
  });
});

Deno.test("net3g4gInfo round-trips a full value", () => {
  const value = {
    sigIntensityLevel: 1,
    sigIntensityValue: -110,
    netMode: 2,
    mobileOperator: 26,
  };

  assertEquals(
    net3g4gInfo.decode(parse(net3g4gInfo.encode(value)).root),
    value,
  );
});

Deno.test("net3g4gInfo rejects a reply without mobileOperator", () => {
  const root = parse(
    '<Net3g4gInfo version="1.1"><sigIntensityLevel>3</sigIntensityLevel>' +
      "<sigIntensityValue>-83</sigIntensityValue><netMode>5</netMode></Net3g4gInfo>",
  ).root;

  assertThrows(() => net3g4gInfo.decode(root), Error, "mobileOperator");
});
