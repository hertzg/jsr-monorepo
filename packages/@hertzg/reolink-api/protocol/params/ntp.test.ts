import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ntp } from "./ntp.ts";

Deno.test("ntp decodes the cmd 38 reply element", () => {
  const root = parse(
    '<Ntp version="1.1"><enable>1</enable><server>pool.ntp.org</server>' +
      "<synchronizeInterval>1440</synchronizeInterval><port>123</port></Ntp>",
  ).root;

  assertEquals(ntp.decode(root), {
    enable: 1,
    server: "pool.ntp.org",
    synchronizeInterval: 1440,
    port: 123,
  });
});

Deno.test("ntp round-trips every field", () => {
  const value = {
    enable: 0,
    server: "time.example.com",
    synchronizeInterval: 60,
    port: 1123,
  };

  assertEquals(ntp.decode(parse(ntp.encode(value)).root), value);
});

Deno.test("ntp writes only the fields given", () => {
  assertEquals(
    ntp.encode({ server: "10.0.0.1" }),
    '<Ntp version="1.1"><server>10.0.0.1</server></Ntp>',
  );
});
