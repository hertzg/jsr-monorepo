// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

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

import { Address4, Address6 } from "npm:ip-address@^10.5.0";

import { addressv4ToArpa } from "../arpav4.ts";
import { addressv6ToArpa } from "../arpav6.ts";

const IPV4 = "192.168.0.1";
const IPV4_NUMBER = 3232235521;
const IPV6 = "2001:db8:85a3::8a2e:370:7334";
const IPV6_BIGINT = 42540766452641154071740215577757643572n;

const ipAddressIpv4 = new Address4(IPV4);
const ipAddressIpv6 = new Address6(IPV6);

Deno.bench("@hertzg/ip addressv4ToArpa", {
  group: "arpa ipv4",
  baseline: true,
}, () => {
  addressv4ToArpa(IPV4_NUMBER);
});

Deno.bench("ip-address reverseForm", { group: "arpa ipv4" }, () => {
  ipAddressIpv4.reverseForm();
});

Deno.bench("@hertzg/ip addressv6ToArpa", {
  group: "arpa ipv6",
  baseline: true,
}, () => {
  addressv6ToArpa(IPV6_BIGINT);
});

Deno.bench("ip-address reverseForm", { group: "arpa ipv6" }, () => {
  ipAddressIpv6.reverseForm();
});
