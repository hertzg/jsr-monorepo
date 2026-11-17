// All three agree on the result: 10.0.0.0/22, 10.1.0.0/16, 172.16.0.0/15,
// 192.168.0.0/16.
//
// cidr-tools is string-only (`type Network = string`), so its case
// necessarily includes parsing and re-stringifying every block.

import { bench, group, summary } from "mitata";
import { mergeCidr } from "cidr-tools";
import { IPv4CidrRange, Pool } from "ip-num";

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

group("cidr merge", () => {
  summary(() => {
    bench("@hertzg/ip cidrMerge", () => {
      cidrMerge(oursMergeBlocks);
    }).baseline(true);

    bench("cidr-tools mergeCidr", () => {
      mergeCidr(MERGE_BLOCKS);
    });

    bench("ip-num Pool aggregate", () => {
      Pool.fromCidrRanges(ipNumMergeBlocks).aggregate();
    });
  });
});
