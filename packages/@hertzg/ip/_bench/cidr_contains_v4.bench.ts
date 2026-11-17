// The hot path of the whole ecosystem: what proxy-addr and pac-resolver
// execute per request.
//
// Every range object is built outside the timed function so this measures
// containment alone. cidr-tools is the exception and cannot be pre-built:
// its API is string-only (`type Network = string`), so its case necessarily
// includes parsing both arguments.

import { bench, group, summary } from "mitata";
import ipaddr from "ipaddr.js";
import { Address4 } from "ip-address";
import { Netmask } from "netmask";
import { containsCidr } from "cidr-tools";

import { parseAddressv4 } from "../addressv4.ts";
import { cidrv4Contains, parseCidrv4 } from "../cidrv4.ts";

const IPV4 = "192.168.1.100";
const CIDR_V4 = "192.168.1.0/24";
const CIDR_V4_WIDE = "10.0.0.0/16";

const oursCidr = parseCidrv4(CIDR_V4);
const oursAddress = parseAddressv4(IPV4).address;

const ipaddrIpv4 = ipaddr.IPv4.parse(IPV4);
const ipaddrCidrV4 = ipaddr.IPv4.parseCIDR(CIDR_V4);
const ipaddrRangeList = {
  local: ipaddr.IPv4.parseCIDR(CIDR_V4),
  corp: ipaddr.IPv4.parseCIDR(CIDR_V4_WIDE),
};

const ipAddressIpv4 = new Address4(IPV4);
const ipAddressSubnet = new Address4(CIDR_V4);

const netmaskBlock = new Netmask(CIDR_V4);

group("cidr contains (v4)", () => {
  summary(() => {
    bench("@hertzg/ip cidrv4Contains", () => {
      cidrv4Contains(oursCidr, oursAddress);
    }).baseline(true);

    bench("ipaddr.js match", () => {
      ipaddrIpv4.match(ipaddrCidrV4);
    });

    bench("ipaddr.js subnetMatch", () => {
      ipaddr.subnetMatch(ipaddrIpv4, ipaddrRangeList, "none");
    });

    bench("ip-address isInSubnet", () => {
      ipAddressIpv4.isInSubnet(ipAddressSubnet);
    });

    bench("netmask contains", () => {
      netmaskBlock.contains(IPV4);
    });

    bench("cidr-tools containsCidr", () => {
      containsCidr(CIDR_V4, IPV4);
    });
  });
});
