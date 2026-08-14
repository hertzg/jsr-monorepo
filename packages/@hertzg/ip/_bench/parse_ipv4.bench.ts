// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// NOT apples-to-apples. `parseIpv4` returns a `number`; ipaddr.js, ip-address
// and ip-num return objects that validate more, retain the original text, and
// carry a large method surface. They are doing more work because they offer
// more. Read this group as "cost of getting an address into memory in each
// library's own idiom", not as a like-for-like algorithm comparison.

import ipaddr from "npm:ipaddr.js@^2.5.0";
import { Address4 } from "npm:ip-address@^10.5.0";
import { ip2long } from "npm:netmask@^2.1.1";
import { IPv4 } from "npm:ip-num@^1.6.2";

import { parseIpv4 } from "../ipv4.ts";

const IPV4 = "192.168.1.100";

Deno.bench("@hertzg/ip parseIpv4", {
  group: "parse ipv4",
  baseline: true,
}, () => {
  parseIpv4(IPV4);
});

Deno.bench("ipaddr.js parse", { group: "parse ipv4" }, () => {
  ipaddr.parse(IPV4);
});

Deno.bench("ip-address Address4", { group: "parse ipv4" }, () => {
  new Address4(IPV4);
});

Deno.bench("netmask ip2long", { group: "parse ipv4" }, () => {
  ip2long(IPV4);
});

Deno.bench("ip-num IPv4", { group: "parse ipv4" }, () => {
  IPv4.fromDecimalDottedString(IPV4);
});
