// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// Competitor address objects are built outside the timed function so this
// measures formatting alone, not parsing.

import ipaddr from "npm:ipaddr.js@^2.5.0";
import { Address4 } from "npm:ip-address@^10.5.0";
import { long2ip } from "npm:netmask@^2.1.1";

import { stringifyIpv4 } from "../ipv4.ts";

const IPV4 = "192.168.1.100";
const IPV4_NUMBER = 3232235876;

const ipaddrIpv4 = ipaddr.IPv4.parse(IPV4);
const ipAddressIpv4 = new Address4(IPV4);

Deno.bench("@hertzg/ip stringifyIpv4", {
  group: "stringify ipv4",
  baseline: true,
}, () => {
  stringifyIpv4(IPV4_NUMBER);
});

Deno.bench("ipaddr.js toString", { group: "stringify ipv4" }, () => {
  ipaddrIpv4.toString();
});

Deno.bench("ip-address correctForm", { group: "stringify ipv4" }, () => {
  ipAddressIpv4.correctForm();
});

Deno.bench("netmask long2ip", { group: "stringify ipv4" }, () => {
  long2ip(IPV4_NUMBER);
});
