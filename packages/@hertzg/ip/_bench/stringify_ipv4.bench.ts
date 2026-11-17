// Competitor address objects are built outside the timed function so this
// measures formatting alone, not parsing.

import { bench, group, summary } from "mitata";
import ipaddr from "ipaddr.js";
import { Address4 } from "ip-address";
import { long2ip } from "netmask";

import { stringifyAddressv4 } from "../addressv4.ts";

const IPV4 = "192.168.1.100";
const IPV4_NUMBER = 3232235876;

const ipaddrIpv4 = ipaddr.IPv4.parse(IPV4);
const ipAddressIpv4 = new Address4(IPV4);

group("stringify ipv4", () => {
  summary(() => {
    bench("@hertzg/ip stringifyAddressv4", () => {
      stringifyAddressv4(IPV4_NUMBER);
    }).baseline(true);

    bench("ipaddr.js toString", () => {
      ipaddrIpv4.toString();
    });

    bench("ip-address correctForm", () => {
      ipAddressIpv4.correctForm();
    });

    bench("netmask long2ip", () => {
      long2ip(IPV4_NUMBER);
    });
  });
});
