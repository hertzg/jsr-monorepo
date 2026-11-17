// netmask is absent: it has no IPv6 validator that returns a boolean.
//
// This measures the accept path only. A library that is quick to accept but
// slow to reject looks better here than it deserves.

import { bench, group, summary } from "mitata";
import ipaddr from "ipaddr.js";
import { Address6 } from "ip-address";
import ipRegex from "ip-regex";

import { isValidAddress } from "../validate.ts";

const IPV6 = "2001:db8:85a3::8a2e:370:7334";

// Each `ipRegex.v6()` call compiles a fresh RegExp, so building it inside the
// timed function would measure regex compilation rather than matching. No `g`
// flag means no `lastIndex` state to share.
const ipRegexV6 = ipRegex.v6({ exact: true });

group("validate ipv6", () => {
  summary(() => {
    bench("@hertzg/ip isValidAddress", () => {
      isValidAddress(IPV6);
    }).baseline(true);

    bench("ipaddr.js isValid", () => {
      ipaddr.IPv6.isValid(IPV6);
    });

    bench("ip-address isValid", () => {
      Address6.isValid(IPV6);
    });

    bench("ip-regex exact test", () => {
      ipRegexV6.test(IPV6);
    });
  });
});
