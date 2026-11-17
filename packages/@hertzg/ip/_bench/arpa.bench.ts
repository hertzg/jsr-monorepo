// ipaddr.js is absent: it has no reverse-pointer method at all.
//
// Competitor address objects are built outside the timed function so this
// measures the name construction alone, not parsing. `reverseForm()` returns
// the absolute name -- trailing dot included -- where this package returns the
// relative one, so the two build strings that differ by a single character.
// Its only option, `{ omitSuffix: true }`, drops `in-addr.arpa` entirely, so
// no call reproduces the relative-with-suffix form.
//
// The routes weighed for where `addressv6ToArpa` gets its nibbles are not benched
// here: that was a one-time comparison, and reading the nibbles back off
// `stringifyAddressv6Expanded` was chosen at 1.38x the fastest route (ADR 0009).

import { bench, group, summary } from "mitata";
import { Address4, Address6 } from "ip-address";

import { addressv4ToArpa } from "../arpav4.ts";
import { addressv6ToArpa } from "../arpav6.ts";

const IPV4 = "192.168.0.1";
const IPV4_NUMBER = 3232235521;
const IPV6 = "2001:db8:85a3::8a2e:370:7334";
const IPV6_BIGINT = 42540766452641154071740215577757643572n;

const ipAddressIpv4 = new Address4(IPV4);
const ipAddressIpv6 = new Address6(IPV6);

group("arpa ipv4", () => {
  summary(() => {
    bench("@hertzg/ip addressv4ToArpa", () => {
      addressv4ToArpa(IPV4_NUMBER);
    }).baseline(true);

    bench("ip-address reverseForm", () => {
      ipAddressIpv4.reverseForm();
    });
  });
});

group("arpa ipv6", () => {
  summary(() => {
    bench("@hertzg/ip addressv6ToArpa", () => {
      addressv6ToArpa(IPV6_BIGINT);
    }).baseline(true);

    bench("ip-address reverseForm", () => {
      ipAddressIpv6.reverseForm();
    });
  });
});
