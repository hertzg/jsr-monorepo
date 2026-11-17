// ip-num is absent: `RangedSet.subtract()` is a union, not a difference — its
// body is `new RangedSet(this.getFirst(), otherRange.getLast())`.
//
// Both agree on the result as a set; we return largest-block-first and
// cidr-tools returns smallest-first.
//
// cidr-tools is string-only (`type Network = string`), so its case
// necessarily includes parsing and re-stringifying.

import { bench, group, summary } from "mitata";
import { excludeCidr } from "cidr-tools";

import { cidrSubtract, parseCidr } from "../cidr.ts";

const SUBTRACT_BASE = "10.0.0.0/8";
const SUBTRACT_EXCLUDE = "10.0.1.0/24";

const oursBase = parseCidr(SUBTRACT_BASE);
const oursExclude = parseCidr(SUBTRACT_EXCLUDE);

group("cidr subtract", () => {
  summary(() => {
    bench("@hertzg/ip cidrSubtract", () => {
      cidrSubtract(oursBase, oursExclude);
    }).baseline(true);

    bench("cidr-tools excludeCidr", () => {
      excludeCidr(SUBTRACT_BASE, SUBTRACT_EXCLUDE);
    });
  });
});
