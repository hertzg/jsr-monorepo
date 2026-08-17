import { assertEquals, assertNotMatch, assertThrows } from "@std/assert";
import { addressv4ToArpa } from "./arpav4.ts";
import { parseAddressv4 } from "./addressv4.ts";

Deno.test("addressv4ToArpa", async (t) => {
  await t.step("reverses the four octets under in-addr.arpa", () => {
    assertEquals(
      addressv4ToArpa(parseAddressv4("192.168.0.1")),
      "1.0.168.192.in-addr.arpa",
    );
    assertEquals(
      addressv4ToArpa(parseAddressv4("8.8.8.8")),
      "8.8.8.8.in-addr.arpa",
    );
  });

  await t.step("all-zero address", () => {
    assertEquals(
      addressv4ToArpa(parseAddressv4("0.0.0.0")),
      "0.0.0.0.in-addr.arpa",
    );
  });

  await t.step("all-ff address", () => {
    assertEquals(
      addressv4ToArpa(parseAddressv4("255.255.255.255")),
      "255.255.255.255.in-addr.arpa",
    );
  });

  await t.step("the name is relative -- no trailing dot", () => {
    assertNotMatch(addressv4ToArpa(parseAddressv4("192.168.0.1")), /\.$/);
  });

  await t.step("an address outside the IPv4 range", () => {
    const IPV4_MAX = 4294967295;

    assertThrows(() => addressv4ToArpa(-1), RangeError);
    assertThrows(() => addressv4ToArpa(IPV4_MAX + 1), RangeError);
    assertThrows(() => addressv4ToArpa(1.5), RangeError);
  });
});
