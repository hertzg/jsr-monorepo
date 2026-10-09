import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { scanAp } from "./scan-ap.ts";

Deno.test("scanAp decodes an RLC-823A cmd 198 reply with two access points", () => {
  const root = parse(
    '<ScanAp version="1.1"><udidList>' +
      "<udid><name>HomeNet</name><signal>80</signal><encrypt>1</encrypt>" +
      "<type>2</type></udid>" +
      "<udid><name>Neighbour</name><signal>25</signal><encrypt>3</encrypt>" +
      "<type>4</type></udid>" +
      "</udidList></ScanAp>",
  ).root;

  assertEquals(scanAp.decode(root), {
    udidList: [
      { name: "HomeNet", signal: 80, encrypt: 1, type: 2 },
      { name: "Neighbour", signal: 25, encrypt: 3, type: 4 },
    ],
  });
});

Deno.test("scanAp decodes a reply that found nothing", () => {
  const root = parse('<ScanAp version="1.1"></ScanAp>').root;

  assertEquals(scanAp.decode(root), {});
});

Deno.test("scanAp rejects an access point without a signal", () => {
  const root = parse(
    '<ScanAp version="1.1"><udidList><udid><name>HomeNet</name>' +
      "<encrypt>1</encrypt><type>2</type></udid></udidList></ScanAp>",
  ).root;

  assertThrows(() => scanAp.decode(root), Error, "<signal>");
});

Deno.test("scanAp round-trips through encode and decode", () => {
  const value = {
    udidList: [{ name: "Cafe", signal: 61, encrypt: 5, type: 6 }],
  };

  const xml = scanAp.encode(value);

  assertEquals(scanAp.decode(parse(xml).root), value);
});

Deno.test("scanAp decodes a Video Doorbell PoE cmd 198 reply without type", () => {
  const root = parse(
    '<ScanAp version="1.1"><udidList>' +
      "<udid><name>HomeNet</name><signal>80</signal><encrypt>1</encrypt></udid>" +
      "<udid><name>Neighbour</name><signal>25</signal><encrypt>3</encrypt>" +
      "</udid></udidList></ScanAp>",
  ).root;

  assertEquals(scanAp.decode(root), {
    udidList: [
      { name: "HomeNet", signal: 80, encrypt: 1 },
      { name: "Neighbour", signal: 25, encrypt: 3 },
    ],
  });
});
