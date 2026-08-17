// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// The hot path of the whole ecosystem: what proxy-addr and pac-resolver
// execute per request.
//
// Every range object is built outside the timed function so this measures
// containment alone. cidr-tools is the exception and cannot be pre-built:
// its API is string-only (`type Network = string`), so its case necessarily
// includes parsing both arguments.

import ipaddr from "npm:ipaddr.js@^2.5.0";
import { Address4 } from "npm:ip-address@^10.5.0";
import { Netmask } from "npm:netmask@^2.1.1";
import { containsCidr } from "npm:cidr-tools@^12.1.3";

import { parseAddressv4 } from "../addressv4.ts";
import { cidrv4Contains, parseCidrv4 } from "../cidrv4.ts";

const IPV4 = "192.168.1.100";
const CIDR_V4 = "192.168.1.0/24";
const CIDR_V4_WIDE = "10.0.0.0/16";

const oursCidr = parseCidrv4(CIDR_V4);
const oursAddress = parseAddressv4(IPV4);

const ipaddrIpv4 = ipaddr.IPv4.parse(IPV4);
const ipaddrCidrV4 = ipaddr.IPv4.parseCIDR(CIDR_V4);
const ipaddrRangeList = {
  local: ipaddr.IPv4.parseCIDR(CIDR_V4),
  corp: ipaddr.IPv4.parseCIDR(CIDR_V4_WIDE),
};

const ipAddressIpv4 = new Address4(IPV4);
const ipAddressSubnet = new Address4(CIDR_V4);

const netmaskBlock = new Netmask(CIDR_V4);

Deno.bench("@hertzg/ip cidrv4Contains", {
  group: "cidr contains (v4)",
  baseline: true,
}, () => {
  cidrv4Contains(oursCidr, oursAddress);
});

Deno.bench("ipaddr.js match", { group: "cidr contains (v4)" }, () => {
  ipaddrIpv4.match(ipaddrCidrV4);
});

Deno.bench("ipaddr.js subnetMatch", { group: "cidr contains (v4)" }, () => {
  ipaddr.subnetMatch(ipaddrIpv4, ipaddrRangeList, "none");
});

Deno.bench("ip-address isInSubnet", { group: "cidr contains (v4)" }, () => {
  ipAddressIpv4.isInSubnet(ipAddressSubnet);
});

Deno.bench("netmask contains", { group: "cidr contains (v4)" }, () => {
  netmaskBlock.contains(IPV4);
});

Deno.bench("cidr-tools containsCidr", { group: "cidr contains (v4)" }, () => {
  containsCidr(CIDR_V4, IPV4);
});
