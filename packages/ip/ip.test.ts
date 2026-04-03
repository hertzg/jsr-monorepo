import { assertEquals } from "@std/assert";
import { parseIp, stringifyIp } from "./ip.ts";

Deno.test("parseIp", async (t) => {
  await t.step("parses IPv4 addresses", () => {
    assertEquals(parseIp("192.168.1.1"), 3232235777);
    assertEquals(parseIp("10.0.0.1"), 167772161);
    assertEquals(parseIp("0.0.0.0"), 0);
    assertEquals(parseIp("255.255.255.255"), 4294967295);
  });

  await t.step("parses IPv6 addresses", () => {
    assertEquals(parseIp("::1"), 1n);
    assertEquals(parseIp("::"), 0n);
    assertEquals(parseIp("2001:db8::1"), 42540766411282592856903984951653826561n);
  });

  await t.step("parses IPv4-mapped IPv6", () => {
    assertEquals(parseIp("::ffff:192.168.1.1"), 0xFFFF_C0A8_0101n);
  });
});

Deno.test("stringifyIp", async (t) => {
  await t.step("stringifies IPv4 addresses", () => {
    assertEquals(stringifyIp(3232235777), "192.168.1.1");
    assertEquals(stringifyIp(0), "0.0.0.0");
  });

  await t.step("stringifies IPv6 addresses", () => {
    assertEquals(stringifyIp(1n), "::1");
    assertEquals(stringifyIp(0n), "::");
    assertEquals(stringifyIp(42540766411282592856903984951653826561n), "2001:db8::1");
  });
});

Deno.test("parseIp round-trip", async (t) => {
  await t.step("IPv4 round-trip", () => {
    const addrs = ["192.168.1.1", "10.0.0.1", "0.0.0.0", "255.255.255.255"];
    for (const addr of addrs) {
      assertEquals(stringifyIp(parseIp(addr) as number), addr);
    }
  });

  await t.step("IPv6 round-trip", () => {
    const addrs = ["::1", "::", "2001:db8::1", "fe80::1"];
    for (const addr of addrs) {
      assertEquals(stringifyIp(parseIp(addr) as bigint), addr);
    }
  });
});
