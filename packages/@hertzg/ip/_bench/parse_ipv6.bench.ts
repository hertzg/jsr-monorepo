// NOT apples-to-apples. `parseAddressv6` returns a `bigint` in a two-field
// object; ipaddr.js, ip-address and ip-num return objects that validate more,
// retain the original text, and carry a large method surface. They are doing
// more work because they offer more. Read this group as "cost of getting an address into memory in each
// library's own idiom", not as a like-for-like algorithm comparison.

import { bench, group, summary } from "mitata";
import ipaddr from "ipaddr.js";
import { Address6 } from "ip-address";
import { IPv6 } from "ip-num";

import { parseAddressv6 } from "../addressv6.ts";

const IPV6 = "2001:db8:85a3::8a2e:370:7334";

group("parse ipv6", () => {
  summary(() => {
    bench("@hertzg/ip parseAddressv6", () => {
      parseAddressv6(IPV6);
    }).baseline(true);

    bench("ipaddr.js parse", () => {
      ipaddr.parse(IPV6);
    });

    bench("ip-address Address6", () => {
      new Address6(IPV6);
    });

    bench("ip-num IPv6", () => {
      IPv6.fromString(IPV6);
    });
  });
});

// The scan costs one pass over the string, so the shape of the input is what
// moves the number: how many groups are written, and whether the tail is an
// embedded IPv4 address handed to `parseAddressv4`.

group("parse ipv6 by shape", () => {
  summary(() => {
    bench("compressed", () => {
      parseAddressv6("2001:db8:85a3::8a2e:370:7334");
    }).baseline(true);

    bench("full eight groups", () => {
      parseAddressv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });

    bench("embedded IPv4 tail", () => {
      parseAddressv6("::ffff:192.168.1.1");
    });

    bench("loopback", () => {
      parseAddressv6("::1");
    });
  });
});
