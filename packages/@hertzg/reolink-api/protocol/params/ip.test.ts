import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { ip } from "./ip.ts";

Deno.test("ip decodes the element the firmware writes", () => {
  const root = parse(
    '<Ip version="1.1"><ip>192.168.1.20</ip><mask>255.255.255.0</mask>' +
      "<mac>ec:71:db:12:34:56</mac><gateway>192.168.1.1</gateway></Ip>",
  ).root;

  assertEquals(ip.decode(root), {
    ip: "192.168.1.20",
    mask: "255.255.255.0",
    mac: "ec:71:db:12:34:56",
    gateway: "192.168.1.1",
  });
});

Deno.test("ip round-trips through encode and decode", () => {
  const value = {
    ip: "10.1.2.3",
    mask: "255.0.0.0",
    mac: "aa:bb:cc:dd:ee:ff",
    gateway: "10.0.0.254",
  };

  assertEquals(ip.decode(parse(ip.encode(value)).root), value);
});

Deno.test("ip encodes a request without the mac", () => {
  const xml = ip.encode({
    ip: "172.16.0.9",
    mask: "255.255.255.0",
    gateway: "172.16.0.1",
  });

  assertEquals(
    xml,
    '<Ip version="1.1"><ip>172.16.0.9</ip><mask>255.255.255.0</mask>' +
      "<gateway>172.16.0.1</gateway></Ip>",
  );
});
