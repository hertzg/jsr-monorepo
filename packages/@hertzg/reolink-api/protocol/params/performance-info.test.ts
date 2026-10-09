import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { performanceInfo } from "./performance-info.ts";

Deno.test("performanceInfo decodes the cmd 122 reply", () => {
  const root = parse(
    '<PerformanceInfo version="1.1"><cpuUseRate>37</cpuUseRate>' +
      "<codeRate>4096</codeRate><netDataRate>512</netDataRate></PerformanceInfo>",
  ).root;

  assertEquals(performanceInfo.decode(root), {
    cpuUseRate: 37,
    codeRate: 4096,
    netDataRate: 512,
  });
});

Deno.test("performanceInfo rejects a reply without netDataRate", () => {
  const root = parse(
    '<PerformanceInfo version="1.1"><cpuUseRate>37</cpuUseRate>' +
      "<codeRate>4096</codeRate></PerformanceInfo>",
  ).root;

  assertThrows(() => performanceInfo.decode(root), Error, "<netDataRate>");
});

Deno.test("performanceInfo round-trips through encode and decode", () => {
  const value = { cpuUseRate: 81, codeRate: 6144, netDataRate: 1024 };

  const xml = performanceInfo.encode(value);

  assertEquals(performanceInfo.decode(parse(xml).root), value);
});
