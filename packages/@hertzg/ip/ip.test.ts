import { assertEquals } from "@std/assert";
import { compareIp, parseIp, stringifyIp } from "./ip.ts";
import { parseIpv4 } from "./ipv4.ts";
import { parseIpv6 } from "./ipv6.ts";

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
    assertEquals(
      parseIp("2001:db8::1"),
      42540766411282592856903984951653826561n,
    );
  });

  await t.step("unwraps IPv4-mapped IPv6 to IPv4", () => {
    assertEquals(parseIp("::ffff:192.168.1.1"), 3232235777);
    assertEquals(parseIp("::ffff:10.0.0.1"), 167772161);
    assertEquals(parseIp("::ffff:0.0.0.0"), 0);
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
    assertEquals(
      stringifyIp(42540766411282592856903984951653826561n),
      "2001:db8::1",
    );
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

Deno.test("compareIp", async (t) => {
  await t.step("delegates to IPv4", () => {
    assertEquals(compareIp(parseIp("10.0.0.1"), parseIp("10.0.0.2")), -1);
    assertEquals(compareIp(parseIp("10.0.0.2"), parseIp("10.0.0.1")), 1);
    assertEquals(compareIp(parseIp("10.0.0.1"), parseIp("10.0.0.1")), 0);
  });

  await t.step("delegates to IPv6", () => {
    assertEquals(compareIp(parseIp("::1"), parseIp("::2")), -1);
    assertEquals(compareIp(parseIp("::2"), parseIp("::1")), 1);
    assertEquals(compareIp(parseIp("::1"), parseIp("::1")), 0);
  });

  await t.step("sorts every IPv4 address before every IPv6 address", () => {
    assertEquals(compareIp(parseIp("255.255.255.255"), parseIp("::")), -1);
    assertEquals(compareIp(parseIp("::"), parseIp("0.0.0.0")), 1);
  });

  await t.step("sorts a mixed list instead of throwing", () => {
    const mixed = ["2001:db8::1", "10.0.0.2", "::1", "10.0.0.1"].map(parseIp);
    assertEquals(mixed.toSorted(compareIp).map(stringifyIp), [
      "10.0.0.1",
      "10.0.0.2",
      "::1",
      "2001:db8::1",
    ]);
  });

  await t.step(
    "an IPv4-mapped bigint is an IPv6 value, not its IPv4 twin",
    () => {
      const mapped = parseIpv6("::ffff:10.0.0.1");
      const plain = parseIpv4("10.0.0.1");

      assertEquals(compareIp(mapped, plain), 1);
      assertEquals(compareIp(plain, mapped), -1);
    },
  );

  await t.step(
    "parseIp unwraps mapped addresses, so they compare equal",
    () => {
      assertEquals(
        compareIp(parseIp("::ffff:10.0.0.1"), parseIp("10.0.0.1")),
        0,
      );
    },
  );
});
