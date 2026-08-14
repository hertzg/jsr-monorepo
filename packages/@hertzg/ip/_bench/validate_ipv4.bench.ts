// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// netmask is absent: `ip2long` throws on bad input rather than returning a
// boolean, so it is not a validator.
//
// This measures the accept path only. A library that is quick to accept but
// slow to reject looks better here than it deserves.

import ipaddr from "npm:ipaddr.js@^2.5.0";
import { Address4 } from "npm:ip-address@^10.5.0";
import ipRegex from "npm:ip-regex@^5.0.0";

import { isValidIp } from "../validate.ts";

const IPV4 = "192.168.1.100";

// Each `ipRegex.v4()` call compiles a fresh RegExp, so building it inside the
// timed function would measure regex compilation rather than matching. No `g`
// flag means no `lastIndex` state to share.
const ipRegexV4 = ipRegex.v4({ exact: true });

Deno.bench("@hertzg/ip isValidIp", {
  group: "validate ipv4",
  baseline: true,
}, () => {
  isValidIp(IPV4);
});

// `ipaddr.IPv4.isValid` also accepts inet_aton short forms such as
// "192.168.1", which the other three reject. It is still the API ipaddr.js
// advertises for validation.
Deno.bench("ipaddr.js isValid", { group: "validate ipv4" }, () => {
  ipaddr.IPv4.isValid(IPV4);
});

Deno.bench("ip-address isValid", { group: "validate ipv4" }, () => {
  Address4.isValid(IPV4);
});

Deno.bench("ip-regex exact test", { group: "validate ipv4" }, () => {
  ipRegexV4.test(IPV4);
});
