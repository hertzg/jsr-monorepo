// deno-lint-ignore-file no-import-prefix -- the competitor packages are
// deliberately not in import_map.json: they are not dependencies of anything
// this repo publishes, only of this on-demand comparison.

// ip-num is absent: `RangedSet.subtract()` is a union, not a difference — its
// body is `new RangedSet(this.getFirst(), otherRange.getLast())`.
//
// Both agree on the result as a set; we return largest-block-first and
// cidr-tools returns smallest-first.
//
// cidr-tools is string-only (`type Network = string`), so its case
// necessarily includes parsing and re-stringifying.

import { excludeCidr } from "npm:cidr-tools@^12.1.3";

import { cidrSubtract, parseCidr } from "../cidr.ts";

const SUBTRACT_BASE = "10.0.0.0/8";
const SUBTRACT_EXCLUDE = "10.0.1.0/24";

const oursBase = parseCidr(SUBTRACT_BASE);
const oursExclude = parseCidr(SUBTRACT_EXCLUDE);

Deno.bench("@hertzg/ip cidrSubtract", {
  group: "cidr subtract",
  baseline: true,
}, () => {
  cidrSubtract(oursBase, oursExclude);
});

Deno.bench("cidr-tools excludeCidr", { group: "cidr subtract" }, () => {
  excludeCidr(SUBTRACT_BASE, SUBTRACT_EXCLUDE);
});
