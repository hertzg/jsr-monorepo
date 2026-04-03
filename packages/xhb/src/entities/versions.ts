import type { Node } from 'xml-parser'
import { parseGDouble, parseGInt } from './_parse.ts'
import printj from 'printj'
const { sprintf } = printj
import type { gDouble, gInt } from './_g_types.ts'

export interface Versions {
  file: gDouble
  data: gInt
}

export function parseVersions({ attributes }: Node): Versions {
  return {
    file: parseGDouble(attributes.v),
    data: parseGInt(attributes.d),
  }
}

export const serializeVersions = (versions: Versions): string =>
  sprintf('<homebank v="%s" d="%06d">', versions.file, versions.data)
