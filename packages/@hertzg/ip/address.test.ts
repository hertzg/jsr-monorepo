import { assertEquals } from "@std/assert";
import { compareAddress, parseAddress, stringifyAddress } from "./address.ts";
import { parseAddressv4 } from "./addressv4.ts";
import { parseAddressv6 } from "./addressv6.ts";

Deno.test("parseAddress", async (t) => {
  await t.step("parses IPv4 addresses", () => {
    assertEquals(parseAddress("192.168.1.1"), 3232235777);
    assertEquals(parseAddress("10.0.0.1"), 167772161);
    assertEquals(parseAddress("0.0.0.0"), 0);
    assertEquals(parseAddress("255.255.255.255"), 4294967295);
  });

  await t.step("parses IPv6 addresses", () => {
    assertEquals(parseAddress("::1"), 1n);
    assertEquals(parseAddress("::"), 0n);
    assertEquals(
      parseAddress("2001:db8::1"),
      42540766411282592856903984951653826561n,
    );
  });

  await t.step("unwraps IPv4-mapped IPv6 to IPv4", () => {
    assertEquals(parseAddress("::ffff:192.168.1.1"), 3232235777);
    assertEquals(parseAddress("::ffff:10.0.0.1"), 167772161);
    assertEquals(parseAddress("::ffff:0.0.0.0"), 0);
  });
});

Deno.test("stringifyAddress", async (t) => {
  await t.step("stringifies IPv4 addresses", () => {
    assertEquals(stringifyAddress(3232235777), "192.168.1.1");
    assertEquals(stringifyAddress(0), "0.0.0.0");
  });

  await t.step("stringifies IPv6 addresses", () => {
    assertEquals(stringifyAddress(1n), "::1");
    assertEquals(stringifyAddress(0n), "::");
    assertEquals(
      stringifyAddress(42540766411282592856903984951653826561n),
      "2001:db8::1",
    );
  });
});

Deno.test("parseAddress round-trip", async (t) => {
  await t.step("IPv4 round-trip", () => {
    const addrs = ["192.168.1.1", "10.0.0.1", "0.0.0.0", "255.255.255.255"];
    for (const addr of addrs) {
      assertEquals(stringifyAddress(parseAddress(addr) as number), addr);
    }
  });

  await t.step("IPv6 round-trip", () => {
    const addrs = ["::1", "::", "2001:db8::1", "fe80::1"];
    for (const addr of addrs) {
      assertEquals(stringifyAddress(parseAddress(addr) as bigint), addr);
    }
  });
});

Deno.test("compareAddress", async (t) => {
  await t.step("delegates to IPv4", () => {
    assertEquals(
      compareAddress(parseAddress("10.0.0.1"), parseAddress("10.0.0.2")),
      -1,
    );
    assertEquals(
      compareAddress(parseAddress("10.0.0.2"), parseAddress("10.0.0.1")),
      1,
    );
    assertEquals(
      compareAddress(parseAddress("10.0.0.1"), parseAddress("10.0.0.1")),
      0,
    );
  });

  await t.step("delegates to IPv6", () => {
    assertEquals(compareAddress(parseAddress("::1"), parseAddress("::2")), -1);
    assertEquals(compareAddress(parseAddress("::2"), parseAddress("::1")), 1);
    assertEquals(compareAddress(parseAddress("::1"), parseAddress("::1")), 0);
  });

  await t.step("sorts every IPv4 address before every IPv6 address", () => {
    assertEquals(
      compareAddress(parseAddress("255.255.255.255"), parseAddress("::")),
      -1,
    );
    assertEquals(
      compareAddress(parseAddress("::"), parseAddress("0.0.0.0")),
      1,
    );
  });

  await t.step("sorts a mixed list instead of throwing", () => {
    const mixed = ["2001:db8::1", "10.0.0.2", "::1", "10.0.0.1"].map(
      parseAddress,
    );
    assertEquals(mixed.toSorted(compareAddress).map(stringifyAddress), [
      "10.0.0.1",
      "10.0.0.2",
      "::1",
      "2001:db8::1",
    ]);
  });

  await t.step(
    "an IPv4-mapped bigint is an IPv6 value, not its IPv4 twin",
    () => {
      const mapped = parseAddressv6("::ffff:10.0.0.1");
      const plain = parseAddressv4("10.0.0.1");

      assertEquals(compareAddress(mapped, plain), 1);
      assertEquals(compareAddress(plain, mapped), -1);
    },
  );

  await t.step(
    "parseAddress unwraps mapped addresses, so they compare equal",
    () => {
      assertEquals(
        compareAddress(
          parseAddress("::ffff:10.0.0.1"),
          parseAddress("10.0.0.1"),
        ),
        0,
      );
    },
  );
});
