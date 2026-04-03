import type { Node } from "xml-parser";
import { atoi, parseGCharP } from "./_parse.ts";
import printj from "printj";
const { sprintf } = printj;
import type { gCharP, gUInt32 } from "./_g_types.ts";

export interface Tag {
  key: gUInt32;
  name: gCharP;
}

export function parseTag({ attributes }: Node): Tag {
  return {
    key: atoi(attributes.key),
    name: parseGCharP(attributes.name),
  };
}

export const serializeTag = (tag: Tag): string =>
  sprintf('<tag key="%d" name="%s"/>', tag.key, tag.name);
