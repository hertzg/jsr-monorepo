// ip-num is absent: its `IPv6.toString()` returns
// "2001:db8:85a3:0:0:8a2e:370:7334" with no `::` compression, so it is not
// producing the RFC 5952 canonical form the others are.
//
// Competitor address objects are built outside the timed function so this
// measures formatting alone, not parsing.

import { bench, group, summary } from "mitata";
import ipaddr from "ipaddr.js";
import { Address6 } from "ip-address";

import { stringifyAddressv6 } from "../addressv6.ts";

const IPV6 = "2001:db8:85a3::8a2e:370:7334";
const IPV6_BIGINT = 42540766452641154071740215577757643572n;

const ipaddrIpv6 = ipaddr.IPv6.parse(IPV6);
const ipAddressIpv6 = new Address6(IPV6);

group("stringify ipv6", () => {
  summary(() => {
    bench("@hertzg/ip stringifyAddressv6", () => {
      stringifyAddressv6(IPV6_BIGINT);
    }).baseline(true);

    bench("ipaddr.js toString", () => {
      ipaddrIpv6.toString();
    });

    bench("ipaddr.js toRFC5952String", () => {
      ipaddrIpv6.toRFC5952String();
    });

    bench("ip-address correctForm", () => {
      ipAddressIpv6.correctForm();
    });
  });
});
