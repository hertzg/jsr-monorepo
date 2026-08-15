// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// ipaddr.js is absent: it has no reverse-pointer method at all.
//
// Competitor address objects are built outside the timed function so this
// measures the name construction alone, not parsing. `reverseForm()` returns
// the relative name by default, matching what this package emits.
//
// The second group reproduces the routes weighed in ADR 0014 for where
// `ipv6ToArpa` gets its nibbles. The shipped function is the baseline; the
// other two are inlined here rather than exported, since the ADR rejected
// them.

import { Address4, Address6 } from "npm:ip-address@^10.5.0";

import { ipv4ToArpa, ipv6ToArpa } from "../arpa.ts";

const IPV4 = "192.168.0.1";
const IPV4_NUMBER = 3232235521;
const IPV6 = "2001:db8:85a3::8a2e:370:7334";
const IPV6_BIGINT = 42540766452641154071740215577757643572n;

const ipAddressIpv4 = new Address4(IPV4);
const ipAddressIpv6 = new Address6(IPV6);

Deno.bench("@hertzg/ip ipv4ToArpa", {
  group: "arpa ipv4",
  baseline: true,
}, () => {
  ipv4ToArpa(IPV4_NUMBER);
});

Deno.bench("ip-address reverseForm", { group: "arpa ipv4" }, () => {
  ipAddressIpv4.reverseForm();
});

Deno.bench("@hertzg/ip ipv6ToArpa", {
  group: "arpa ipv6",
  baseline: true,
}, () => {
  ipv6ToArpa(IPV6_BIGINT);
});

Deno.bench("ip-address reverseForm", { group: "arpa ipv6" }, () => {
  ipAddressIpv6.reverseForm();
});

Deno.bench("read back off the expanded string (shipped)", {
  group: "arpa ipv6 route",
  baseline: true,
}, () => {
  ipv6ToArpa(IPV6_BIGINT);
});

function arpaByGroupExtract(address: bigint): string {
  const nibbles: string[] = [];
  for (let i = 0; i < 8; i++) {
    const group = Number((address >> BigInt(i * 16)) & 0xFFFFn);
    for (let shift = 0; shift < 16; shift += 4) {
      nibbles.push(((group >>> shift) & 0xF).toString(16));
    }
  }
  return `${nibbles.join(".")}.ip6.arpa`;
}

function arpaByBigintNibbleShift(address: bigint): string {
  const nibbles: string[] = [];
  for (let i = 0; i < 32; i++) {
    nibbles.push(Number((address >> BigInt(i * 4)) & 0xFn).toString(16));
  }
  return `${nibbles.join(".")}.ip6.arpa`;
}

Deno.bench("8 group extracts, nibbles peeled as number", {
  group: "arpa ipv6 route",
}, () => {
  arpaByGroupExtract(IPV6_BIGINT);
});

Deno.bench("32 bigint nibble shifts", { group: "arpa ipv6 route" }, () => {
  arpaByBigintNibbleShift(IPV6_BIGINT);
});
