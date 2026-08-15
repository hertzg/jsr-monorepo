import { assertEquals } from "@std/assert";
import { cidrVersion, ipVersion } from "./version.ts";
import { parseIp } from "./ip.ts";

Deno.test("ipVersion", async (t) => {
  await t.step("reports 4 for IPv4 addresses", () => {
    assertEquals(ipVersion("10.1.2.3"), 4);
    assertEquals(ipVersion("0.0.0.0"), 4);
    assertEquals(ipVersion("255.255.255.255"), 4);
  });

  await t.step("reports 6 for IPv6 addresses", () => {
    assertEquals(ipVersion("::"), 6);
    assertEquals(ipVersion("::1"), 6);
    assertEquals(ipVersion("2001:db8::1"), 6);
    assertEquals(ipVersion("fe80::1%eth0"), 6);
  });

  await t.step("reports 6 for IPv4-mapped IPv6, as written", () => {
    assertEquals(ipVersion("::ffff:10.1.2.3"), 6);
    assertEquals(ipVersion("::ffff:c0a8:101"), 6);
  });

  await t.step("disagrees with typeof parseIp on IPv4-mapped input", () => {
    const mapped = "::ffff:10.1.2.3";
    assertEquals(ipVersion(mapped), 6);
    assertEquals(typeof parseIp(mapped), "number");
  });

  await t.step("returns undefined for invalid input, never 0", () => {
    assertEquals(ipVersion("notanip"), undefined);
    assertEquals(ipVersion(""), undefined);
    assertEquals(ipVersion("999.999.999.999"), undefined);
    assertEquals(ipVersion("gggg::1"), undefined);
    assertEquals(ipVersion("2001:db8:::1"), undefined);
  });

  await t.step("rejects CIDR notation", () => {
    assertEquals(ipVersion("10.0.0.0/8"), undefined);
    assertEquals(ipVersion("2001:db8::/32"), undefined);
  });

  await t.step("rejects inet_aton short forms", () => {
    assertEquals(ipVersion("1"), undefined);
    assertEquals(ipVersion("192.168.1"), undefined);
    assertEquals(ipVersion("3232235777"), undefined);
  });

  await t.step(
    "rejects whitespace and trailing text, as the parsers do",
    () => {
      assertEquals(ipVersion(" 10.1.2.3"), undefined);
      assertEquals(ipVersion("1.2.3.4abc"), undefined);
      assertEquals(ipVersion("::1 "), undefined);
    },
  );
});

Deno.test("cidrVersion", async (t) => {
  await t.step("reports 4 for IPv4 CIDR notation", () => {
    assertEquals(cidrVersion("10.0.0.0/8"), 4);
    assertEquals(cidrVersion("0.0.0.0/0"), 4);
    assertEquals(cidrVersion("192.168.1.1/32"), 4);
  });

  await t.step("reports 6 for IPv6 CIDR notation", () => {
    assertEquals(cidrVersion("::/0"), 6);
    assertEquals(cidrVersion("2001:db8::/32"), 6);
    assertEquals(cidrVersion("::1/128"), 6);
    assertEquals(cidrVersion("::ffff:10.0.0.0/120"), 6);
  });

  await t.step("returns undefined for a plain address", () => {
    assertEquals(cidrVersion("10.0.0.0"), undefined);
    assertEquals(cidrVersion("::1"), undefined);
  });

  await t.step("returns undefined for out-of-range prefix lengths", () => {
    assertEquals(cidrVersion("10.0.0.0/33"), undefined);
    assertEquals(cidrVersion("10.0.0.0/-1"), undefined);
    assertEquals(cidrVersion("2001:db8::/129"), undefined);
  });

  await t.step("returns undefined for invalid input", () => {
    assertEquals(cidrVersion(""), undefined);
    assertEquals(cidrVersion("garbage/24"), undefined);
    assertEquals(cidrVersion("10.0.0.0/"), undefined);
    assertEquals(cidrVersion("10.0.0.0/8/9"), undefined);
  });
});
