import { assert, assertEquals } from "@std/assert";
import { parseIpv4 } from "./ipv4.ts";
import {
  classifyIpv4,
  isIpv4Benchmarking,
  isIpv4Broadcast,
  isIpv4CgNat,
  isIpv4Documentation,
  isIpv4LinkLocal,
  isIpv4Loopback,
  isIpv4Multicast,
  isIpv4Private,
  isIpv4Public,
  isIpv4Reserved,
  isIpv4ThisNetwork,
} from "./classifyv4.ts";

Deno.test("isIpv4Private", async (t) => {
  await t.step("matches 10.0.0.0/8", () => {
    assert(isIpv4Private(parseIpv4("10.0.0.0")));
    assert(isIpv4Private(parseIpv4("10.0.0.1")));
    assert(isIpv4Private(parseIpv4("10.255.255.255")));
  });

  await t.step("matches 172.16.0.0/12", () => {
    assert(isIpv4Private(parseIpv4("172.16.0.0")));
    assert(isIpv4Private(parseIpv4("172.16.0.1")));
    assert(isIpv4Private(parseIpv4("172.31.255.255")));
  });

  await t.step("matches 192.168.0.0/16", () => {
    assert(isIpv4Private(parseIpv4("192.168.0.0")));
    assert(isIpv4Private(parseIpv4("192.168.1.1")));
    assert(isIpv4Private(parseIpv4("192.168.255.255")));
  });

  await t.step("rejects non-private", () => {
    assertEquals(isIpv4Private(parseIpv4("9.255.255.255")), false);
    assertEquals(isIpv4Private(parseIpv4("11.0.0.0")), false);
    assertEquals(isIpv4Private(parseIpv4("172.15.255.255")), false);
    assertEquals(isIpv4Private(parseIpv4("172.32.0.0")), false);
    assertEquals(isIpv4Private(parseIpv4("192.167.255.255")), false);
    assertEquals(isIpv4Private(parseIpv4("192.169.0.0")), false);
    assertEquals(isIpv4Private(parseIpv4("8.8.8.8")), false);
  });
});

Deno.test("isIpv4Loopback", async (t) => {
  await t.step("matches 127.0.0.0/8", () => {
    assert(isIpv4Loopback(parseIpv4("127.0.0.0")));
    assert(isIpv4Loopback(parseIpv4("127.0.0.1")));
    assert(isIpv4Loopback(parseIpv4("127.255.255.255")));
  });

  await t.step("rejects non-loopback", () => {
    assertEquals(isIpv4Loopback(parseIpv4("126.255.255.255")), false);
    assertEquals(isIpv4Loopback(parseIpv4("128.0.0.0")), false);
  });
});

Deno.test("isIpv4LinkLocal", async (t) => {
  await t.step("matches 169.254.0.0/16", () => {
    assert(isIpv4LinkLocal(parseIpv4("169.254.0.0")));
    assert(isIpv4LinkLocal(parseIpv4("169.254.1.1")));
    assert(isIpv4LinkLocal(parseIpv4("169.254.255.255")));
  });

  await t.step("rejects non-link-local", () => {
    assertEquals(isIpv4LinkLocal(parseIpv4("169.253.255.255")), false);
    assertEquals(isIpv4LinkLocal(parseIpv4("169.255.0.0")), false);
  });
});

Deno.test("isIpv4Multicast", async (t) => {
  await t.step("matches 224.0.0.0/4", () => {
    assert(isIpv4Multicast(parseIpv4("224.0.0.0")));
    assert(isIpv4Multicast(parseIpv4("224.0.0.1")));
    assert(isIpv4Multicast(parseIpv4("230.1.2.3")));
    assert(isIpv4Multicast(parseIpv4("239.255.255.255")));
  });

  await t.step("rejects non-multicast", () => {
    assertEquals(isIpv4Multicast(parseIpv4("223.255.255.255")), false);
    assertEquals(isIpv4Multicast(parseIpv4("240.0.0.0")), false);
  });
});

Deno.test("isIpv4Reserved", async (t) => {
  await t.step("matches 240.0.0.0/4 excluding broadcast", () => {
    assert(isIpv4Reserved(parseIpv4("240.0.0.0")));
    assert(isIpv4Reserved(parseIpv4("250.1.2.3")));
    assert(isIpv4Reserved(parseIpv4("255.255.255.254")));
  });

  await t.step("excludes broadcast", () => {
    assertEquals(isIpv4Reserved(parseIpv4("255.255.255.255")), false);
  });

  await t.step("rejects non-reserved", () => {
    assertEquals(isIpv4Reserved(parseIpv4("239.255.255.255")), false);
    assertEquals(isIpv4Reserved(parseIpv4("8.8.8.8")), false);
  });
});

Deno.test("isIpv4Broadcast", async (t) => {
  await t.step("matches 255.255.255.255", () => {
    assert(isIpv4Broadcast(parseIpv4("255.255.255.255")));
  });

  await t.step("rejects non-broadcast", () => {
    assertEquals(isIpv4Broadcast(parseIpv4("255.255.255.254")), false);
    assertEquals(isIpv4Broadcast(parseIpv4("0.0.0.0")), false);
  });
});

Deno.test("isIpv4ThisNetwork", async (t) => {
  await t.step("matches 0.0.0.0/8", () => {
    assert(isIpv4ThisNetwork(parseIpv4("0.0.0.0")));
    assert(isIpv4ThisNetwork(parseIpv4("0.0.0.1")));
    assert(isIpv4ThisNetwork(parseIpv4("0.255.255.255")));
  });

  await t.step("rejects non-this-network", () => {
    assertEquals(isIpv4ThisNetwork(parseIpv4("1.0.0.0")), false);
  });
});

Deno.test("isIpv4CgNat", async (t) => {
  await t.step("matches 100.64.0.0/10", () => {
    assert(isIpv4CgNat(parseIpv4("100.64.0.0")));
    assert(isIpv4CgNat(parseIpv4("100.100.100.100")));
    assert(isIpv4CgNat(parseIpv4("100.127.255.255")));
  });

  await t.step("rejects non-cgnat", () => {
    assertEquals(isIpv4CgNat(parseIpv4("100.63.255.255")), false);
    assertEquals(isIpv4CgNat(parseIpv4("100.128.0.0")), false);
  });
});

Deno.test("isIpv4Benchmarking", async (t) => {
  await t.step("matches 198.18.0.0/15", () => {
    assert(isIpv4Benchmarking(parseIpv4("198.18.0.0")));
    assert(isIpv4Benchmarking(parseIpv4("198.19.255.255")));
  });

  await t.step("rejects non-benchmarking", () => {
    assertEquals(isIpv4Benchmarking(parseIpv4("198.17.255.255")), false);
    assertEquals(isIpv4Benchmarking(parseIpv4("198.20.0.0")), false);
  });
});

Deno.test("isIpv4Documentation", async (t) => {
  await t.step("matches 192.0.2.0/24 (TEST-NET-1)", () => {
    assert(isIpv4Documentation(parseIpv4("192.0.2.0")));
    assert(isIpv4Documentation(parseIpv4("192.0.2.255")));
  });

  await t.step("matches 198.51.100.0/24 (TEST-NET-2)", () => {
    assert(isIpv4Documentation(parseIpv4("198.51.100.0")));
    assert(isIpv4Documentation(parseIpv4("198.51.100.255")));
  });

  await t.step("matches 203.0.113.0/24 (TEST-NET-3)", () => {
    assert(isIpv4Documentation(parseIpv4("203.0.113.0")));
    assert(isIpv4Documentation(parseIpv4("203.0.113.255")));
  });

  await t.step("rejects non-documentation", () => {
    assertEquals(isIpv4Documentation(parseIpv4("192.0.1.255")), false);
    assertEquals(isIpv4Documentation(parseIpv4("192.0.3.0")), false);
    assertEquals(isIpv4Documentation(parseIpv4("198.51.99.255")), false);
    assertEquals(isIpv4Documentation(parseIpv4("198.51.101.0")), false);
    assertEquals(isIpv4Documentation(parseIpv4("203.0.112.255")), false);
    assertEquals(isIpv4Documentation(parseIpv4("203.0.114.0")), false);
  });
});

Deno.test("isIpv4Public", async (t) => {
  await t.step("matches public addresses", () => {
    assert(isIpv4Public(parseIpv4("8.8.8.8")));
    assert(isIpv4Public(parseIpv4("1.1.1.1")));
    assert(isIpv4Public(parseIpv4("93.184.216.34")));
    assert(isIpv4Public(parseIpv4("151.101.1.140")));
  });

  await t.step("rejects all special ranges", () => {
    assertEquals(isIpv4Public(parseIpv4("10.0.0.1")), false); // private
    assertEquals(isIpv4Public(parseIpv4("172.16.0.1")), false); // private
    assertEquals(isIpv4Public(parseIpv4("192.168.1.1")), false); // private
    assertEquals(isIpv4Public(parseIpv4("127.0.0.1")), false); // loopback
    assertEquals(isIpv4Public(parseIpv4("169.254.1.1")), false); // link-local
    assertEquals(isIpv4Public(parseIpv4("224.0.0.1")), false); // multicast
    assertEquals(isIpv4Public(parseIpv4("240.0.0.1")), false); // reserved
    assertEquals(isIpv4Public(parseIpv4("255.255.255.255")), false); // broadcast
    assertEquals(isIpv4Public(parseIpv4("0.0.0.0")), false); // this-network
    assertEquals(isIpv4Public(parseIpv4("100.64.0.1")), false); // cg-nat
    assertEquals(isIpv4Public(parseIpv4("198.18.0.1")), false); // benchmarking
    assertEquals(isIpv4Public(parseIpv4("192.0.2.1")), false); // documentation
  });
});

Deno.test("classifyIpv4", async (t) => {
  await t.step("classifies all range types", () => {
    assertEquals(classifyIpv4(parseIpv4("255.255.255.255")), "broadcast");
    assertEquals(classifyIpv4(parseIpv4("0.0.0.0")), "this-network");
    assertEquals(classifyIpv4(parseIpv4("0.0.0.1")), "this-network");
    assertEquals(classifyIpv4(parseIpv4("127.0.0.1")), "loopback");
    assertEquals(classifyIpv4(parseIpv4("169.254.1.1")), "link-local");
    assertEquals(classifyIpv4(parseIpv4("192.0.2.1")), "documentation");
    assertEquals(classifyIpv4(parseIpv4("198.51.100.1")), "documentation");
    assertEquals(classifyIpv4(parseIpv4("203.0.113.1")), "documentation");
    assertEquals(classifyIpv4(parseIpv4("198.18.0.1")), "benchmarking");
    assertEquals(classifyIpv4(parseIpv4("100.64.0.1")), "cg-nat");
    assertEquals(classifyIpv4(parseIpv4("10.0.0.1")), "private");
    assertEquals(classifyIpv4(parseIpv4("172.16.0.1")), "private");
    assertEquals(classifyIpv4(parseIpv4("192.168.1.1")), "private");
    assertEquals(classifyIpv4(parseIpv4("224.0.0.1")), "multicast");
    assertEquals(classifyIpv4(parseIpv4("240.0.0.0")), "reserved");
    assertEquals(classifyIpv4(parseIpv4("8.8.8.8")), "public");
    assertEquals(classifyIpv4(parseIpv4("1.1.1.1")), "public");
  });
});
