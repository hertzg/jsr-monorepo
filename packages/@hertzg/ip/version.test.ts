import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { addressVersion, cidrVersion } from "./version.ts";
import { parseAddress } from "./address.ts";

test("addressVersion", async (t) => {
  await t.test("reports 4 for IPv4 addresses", () => {
    assertEquals(addressVersion("10.1.2.3"), 4);
    assertEquals(addressVersion("0.0.0.0"), 4);
    assertEquals(addressVersion("255.255.255.255"), 4);
  });

  await t.test("reports 6 for IPv6 addresses", () => {
    assertEquals(addressVersion("::"), 6);
    assertEquals(addressVersion("::1"), 6);
    assertEquals(addressVersion("2001:db8::1"), 6);
    assertEquals(addressVersion("fe80::1%eth0"), 6);
  });

  await t.test("reports 6 for IPv4-mapped IPv6, as written", () => {
    assertEquals(addressVersion("::ffff:10.1.2.3"), 6);
    assertEquals(addressVersion("::ffff:c0a8:101"), 6);
  });

  await t.test(
    "disagrees with typeof parseAddress on IPv4-mapped input",
    () => {
      const mapped = "::ffff:10.1.2.3";
      assertEquals(addressVersion(mapped), 6);
      assertEquals(typeof parseAddress(mapped).address, "number");
    },
  );

  await t.test("returns undefined for invalid input, never 0", () => {
    assertEquals(addressVersion("notanip"), undefined);
    assertEquals(addressVersion(""), undefined);
    assertEquals(addressVersion("999.999.999.999"), undefined);
    assertEquals(addressVersion("gggg::1"), undefined);
    assertEquals(addressVersion("2001:db8:::1"), undefined);
  });

  await t.test("rejects CIDR notation", () => {
    assertEquals(addressVersion("10.0.0.0/8"), undefined);
    assertEquals(addressVersion("2001:db8::/32"), undefined);
  });

  await t.test("accepts a zone ID on either version", () => {
    assertEquals(addressVersion("192.168.1.1%ether1"), 4);
    assertEquals(addressVersion("fe80::1%"), undefined);
  });

  await t.test(
    "reads the version off the address slot, as the parsers do",
    () => {
      assertEquals(addressVersion("10.0.0.1%eth0:1"), 4);
      assertEquals(cidrVersion("10.0.0.0%eth0:1/8"), 4);
      assertEquals(cidrVersion("10.0.0.0/ffff:ff00::"), undefined);
    },
  );

  await t.test("rejects inet_aton short forms", () => {
    assertEquals(addressVersion("1"), undefined);
    assertEquals(addressVersion("192.168.1"), undefined);
    assertEquals(addressVersion("3232235777"), undefined);
  });

  await t.test(
    "rejects whitespace and trailing text, as the parsers do",
    () => {
      assertEquals(addressVersion(" 10.1.2.3"), undefined);
      assertEquals(addressVersion("1.2.3.4abc"), undefined);
      assertEquals(addressVersion("::1 "), undefined);
    },
  );
});

test("cidrVersion", async (t) => {
  await t.test("reports 4 for IPv4 CIDR notation", () => {
    assertEquals(cidrVersion("10.0.0.0/8"), 4);
    assertEquals(cidrVersion("0.0.0.0/0"), 4);
    assertEquals(cidrVersion("192.168.1.1/32"), 4);
  });

  await t.test("reports 6 for IPv6 CIDR notation", () => {
    assertEquals(cidrVersion("::/0"), 6);
    assertEquals(cidrVersion("2001:db8::/32"), 6);
    assertEquals(cidrVersion("::1/128"), 6);
    assertEquals(cidrVersion("::ffff:10.0.0.0/120"), 6);
  });

  await t.test("returns undefined for a plain address", () => {
    assertEquals(cidrVersion("10.0.0.0"), undefined);
    assertEquals(cidrVersion("::1"), undefined);
  });

  await t.test(
    "reports the mask dialect and zone IDs, as the parsers do",
    () => {
      assertEquals(cidrVersion("10.0.0.0/255.0.0.0"), 4);
      assertEquals(cidrVersion("fe80::/ffff:ffff::"), 6);
      assertEquals(cidrVersion("fe80::%ether1/64"), 6);
      assertEquals(cidrVersion("10.0.0.0/ffff:ff00::"), undefined);
    },
  );

  await t.test("returns undefined for out-of-range prefix lengths", () => {
    assertEquals(cidrVersion("10.0.0.0/33"), undefined);
    assertEquals(cidrVersion("10.0.0.0/-1"), undefined);
    assertEquals(cidrVersion("2001:db8::/129"), undefined);
  });

  await t.test("returns undefined for invalid input", () => {
    assertEquals(cidrVersion(""), undefined);
    assertEquals(cidrVersion("garbage/24"), undefined);
    assertEquals(cidrVersion("10.0.0.0/"), undefined);
    assertEquals(cidrVersion("10.0.0.0/8/9"), undefined);
  });
});
