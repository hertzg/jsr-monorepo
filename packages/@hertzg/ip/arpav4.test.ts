import { assertEquals, assertFalse, assertThrows } from "@std/assert";
import { ipv4ToArpa } from "./arpav4.ts";
import { parseIpv4 } from "./ipv4.ts";

Deno.test("ipv4ToArpa", async (t) => {
  await t.step("reverses the four octets under in-addr.arpa", () => {
    assertEquals(
      ipv4ToArpa(parseIpv4("192.168.0.1")),
      "1.0.168.192.in-addr.arpa",
    );
    assertEquals(ipv4ToArpa(parseIpv4("8.8.8.8")), "8.8.8.8.in-addr.arpa");
  });

  await t.step("all-zero address", () => {
    assertEquals(ipv4ToArpa(parseIpv4("0.0.0.0")), "0.0.0.0.in-addr.arpa");
  });

  await t.step("all-ff address", () => {
    assertEquals(
      ipv4ToArpa(parseIpv4("255.255.255.255")),
      "255.255.255.255.in-addr.arpa",
    );
  });

  await t.step("the name is relative -- no trailing dot", () => {
    assertFalse(ipv4ToArpa(parseIpv4("192.168.0.1")).endsWith("."));
  });

  await t.step("an address outside the IPv4 range", () => {
    const MAX_IPV4 = 4294967295;

    assertThrows(() => ipv4ToArpa(-1), RangeError);
    assertThrows(() => ipv4ToArpa(MAX_IPV4 + 1), RangeError);
    assertThrows(() => ipv4ToArpa(1.5), RangeError);
  });
});
