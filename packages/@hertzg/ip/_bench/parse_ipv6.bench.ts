// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// NOT apples-to-apples. `parseIpv6` returns a `bigint`; ipaddr.js, ip-address
// and ip-num return objects that validate more, retain the original text, and
// carry a large method surface. They are doing more work because they offer
// more. Read this group as "cost of getting an address into memory in each
// library's own idiom", not as a like-for-like algorithm comparison.

import ipaddr from "npm:ipaddr.js@^2.5.0";
import { Address6 } from "npm:ip-address@^10.5.0";
import { IPv6 } from "npm:ip-num@^1.6.2";

import { parseIpv6 } from "../ipv6.ts";

const IPV6 = "2001:db8:85a3::8a2e:370:7334";

Deno.bench("@hertzg/ip parseIpv6", {
  group: "parse ipv6",
  baseline: true,
}, () => {
  parseIpv6(IPV6);
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
