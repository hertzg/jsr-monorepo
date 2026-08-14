// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// ip-num is absent: its `IPv6.toString()` returns
// "2001:db8:85a3:0:0:8a2e:370:7334" with no `::` compression, so it is not
// producing the RFC 5952 canonical form the others are.
//
// Competitor address objects are built outside the timed function so this
// measures formatting alone, not parsing.

import ipaddr from "npm:ipaddr.js@^2.5.0";
import { Address6 } from "npm:ip-address@^10.5.0";

import { stringifyIpv6 } from "../ipv6.ts";

const IPV6 = "2001:db8:85a3::8a2e:370:7334";
const IPV6_BIGINT = 42540766452641154071740215577757643572n;

const ipaddrIpv6 = ipaddr.IPv6.parse(IPV6);
const ipAddressIpv6 = new Address6(IPV6);

Deno.bench("@hertzg/ip stringifyIpv6", {
  group: "stringify ipv6",
  baseline: true,
}, () => {
  stringifyIpv6(IPV6_BIGINT);
});

Deno.bench("ipaddr.js toString", { group: "stringify ipv6" }, () => {
  ipaddrIpv6.toString();
});

Deno.bench("ipaddr.js toRFC5952String", { group: "stringify ipv6" }, () => {
  ipaddrIpv6.toRFC5952String();
});

Deno.bench("ip-address correctForm", { group: "stringify ipv6" }, () => {
  ipAddressIpv6.correctForm();
});
