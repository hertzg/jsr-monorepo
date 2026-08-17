// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// netmask is absent: it has no IPv6 validator that returns a boolean.
//
// This measures the accept path only. A library that is quick to accept but
// slow to reject looks better here than it deserves.

import ipaddr from "npm:ipaddr.js@^2.5.0";
import { Address6 } from "npm:ip-address@^10.5.0";
import ipRegex from "npm:ip-regex@^5.0.0";

import { isValidAddress } from "../validate.ts";

const IPV6 = "2001:db8:85a3::8a2e:370:7334";

// Each `ipRegex.v6()` call compiles a fresh RegExp, so building it inside the
// timed function would measure regex compilation rather than matching. No `g`
// flag means no `lastIndex` state to share.
const ipRegexV6 = ipRegex.v6({ exact: true });

Deno.bench("@hertzg/ip isValidAddress", {
  group: "validate ipv6",
  baseline: true,
}, () => {
  isValidAddress(IPV6);
});

Deno.bench("ipaddr.js isValid", { group: "validate ipv6" }, () => {
  ipaddr.IPv6.isValid(IPV6);
});

Deno.bench("ip-address isValid", { group: "validate ipv6" }, () => {
  Address6.isValid(IPV6);
});

Deno.bench("ip-regex exact test", { group: "validate ipv6" }, () => {
  ipRegexV6.test(IPV6);
});
