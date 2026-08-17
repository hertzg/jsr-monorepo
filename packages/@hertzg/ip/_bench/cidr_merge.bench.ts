// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// All three agree on the result: 10.0.0.0/22, 10.1.0.0/16, 172.16.0.0/15,
// 192.168.0.0/16.
//
// cidr-tools is string-only (`type Network = string`), so its case
// necessarily includes parsing and re-stringifying every block.

import { mergeCidr } from "npm:cidr-tools@^12.1.3";
import { IPv4CidrRange, Pool } from "npm:ip-num@^1.6.2";

import { cidrMerge, parseCidr } from "../cidr.ts";

const MERGE_BLOCKS = [
  "10.0.0.0/24",
  "10.0.1.0/24",
  "10.0.2.0/24",
  "10.0.2.128/25",
  "10.0.3.0/24",
  "192.168.0.0/16",
  "192.168.1.0/24",
  "172.16.0.0/16",
  "172.17.0.0/16",
  "10.1.0.0/16",
];

const oursMergeBlocks = MERGE_BLOCKS.map((s) => parseCidr(s));
const ipNumMergeBlocks = MERGE_BLOCKS.map((block) =>
  IPv4CidrRange.fromCidr(block)
);

Deno.bench("@hertzg/ip cidrMerge", {
  group: "cidr merge",
  baseline: true,
}, () => {
  cidrMerge(oursMergeBlocks);
});

Deno.bench("cidr-tools mergeCidr", { group: "cidr merge" }, () => {
  mergeCidr(MERGE_BLOCKS);
});

Deno.bench("ip-num Pool aggregate", { group: "cidr merge" }, () => {
  Pool.fromCidrRanges(ipNumMergeBlocks).aggregate();
});
