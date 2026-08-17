// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// NOT apples-to-apples. `parseAddressv6` returns a `bigint` in a two-field
// object; ipaddr.js, ip-address and ip-num return objects that validate more,
// retain the original text, and carry a large method surface. They are doing
// more work because they offer more. Read this group as "cost of getting an address into memory in each
// library's own idiom", not as a like-for-like algorithm comparison.

import ipaddr from "npm:ipaddr.js@^2.5.0";
import { Address6 } from "npm:ip-address@^10.5.0";
import { IPv6 } from "npm:ip-num@^1.6.2";

import { parseAddressv6 } from "../addressv6.ts";

const IPV6 = "2001:db8:85a3::8a2e:370:7334";

Deno.bench("@hertzg/ip parseAddressv6", {
  group: "parse ipv6",
  baseline: true,
}, () => {
  parseAddressv6(IPV6);
});

Deno.bench("ipaddr.js parse", { group: "parse ipv6" }, () => {
  ipaddr.parse(IPV6);
});

Deno.bench("ip-address Address6", { group: "parse ipv6" }, () => {
  new Address6(IPV6);
});

Deno.bench("ip-num IPv6", { group: "parse ipv6" }, () => {
  IPv6.fromString(IPV6);
});

// The scan costs one pass over the string, so the shape of the input is what
// moves the number: how many groups are written, and whether the tail is an
// embedded IPv4 address handed to `parseAddressv4`.

Deno.bench("compressed", {
  group: "parse ipv6 by shape",
  baseline: true,
}, () => {
  parseAddressv6("2001:db8:85a3::8a2e:370:7334");
});

Deno.bench("full eight groups", { group: "parse ipv6 by shape" }, () => {
  parseAddressv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
});

Deno.bench("embedded IPv4 tail", { group: "parse ipv6 by shape" }, () => {
  parseAddressv6("::ffff:192.168.1.1");
});

Deno.bench("loopback", { group: "parse ipv6 by shape" }, () => {
  parseAddressv6("::1");
});
