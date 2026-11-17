// netmask is absent: `ip2long` throws on bad input rather than returning a
// boolean, so it is not a validator.
//
// This measures the accept path only. A library that is quick to accept but
// slow to reject looks better here than it deserves.

import { bench, group, summary } from "mitata";
import ipaddr from "ipaddr.js";
import { Address4 } from "ip-address";
import ipRegex from "ip-regex";

import { isValidAddress } from "../validate.ts";

const IPV4 = "192.168.1.100";

// Each `ipRegex.v4()` call compiles a fresh RegExp, so building it inside the
// timed function would measure regex compilation rather than matching. No `g`
// flag means no `lastIndex` state to share.
const ipRegexV4 = ipRegex.v4({ exact: true });

group("validate ipv4", () => {
  summary(() => {
    bench("@hertzg/ip isValidAddress", () => {
      isValidAddress(IPV4);
    }).baseline(true);

    // `ipaddr.IPv4.isValid` also accepts inet_aton short forms such as
    // "192.168.1", which the other three reject. It is still the API ipaddr.js
    // advertises for validation.
    bench("ipaddr.js isValid", () => {
      ipaddr.IPv4.isValid(IPV4);
    });

    bench("ip-address isValid", () => {
      Address4.isValid(IPV4);
    });

    bench("ip-regex exact test", () => {
      ipRegexV4.test(IPV4);
    });
  });
});
