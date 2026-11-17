// NOT apples-to-apples. `parseAddressv4` returns a `number` in a two-field
// object; ipaddr.js, ip-address and ip-num return objects that validate more,
// retain the original text, and carry a large method surface. They are doing
// more work because they offer more. Read this group as "cost of getting an address into memory in each
// library's own idiom", not as a like-for-like algorithm comparison.

import { bench, group, summary } from "mitata";
import ipaddr from "ipaddr.js";
import { Address4 } from "ip-address";
import { ip2long } from "netmask";
import { IPv4 } from "ip-num";

import { parseAddressv4 } from "../addressv4.ts";

const IPV4 = "192.168.1.100";

group("parse ipv4", () => {
  summary(() => {
    bench("@hertzg/ip parseAddressv4", () => {
      parseAddressv4(IPV4);
    }).baseline(true);

    bench("ipaddr.js parse", () => {
      ipaddr.parse(IPV4);
    });

    bench("ip-address Address4", () => {
      new Address4(IPV4);
    });

    bench("netmask ip2long", () => {
      ip2long(IPV4);
    });

    bench("ip-num IPv4", () => {
      IPv4.fromDecimalDottedString(IPV4);
    });
  });
});
