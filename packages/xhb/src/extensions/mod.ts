/**
 * Extension handlers for HomeBank XHB entity fields that require
 * special parse/serialize logic beyond simple attribute mapping.
 *
 * @module
 */

export type { EntityExtension } from "./types.ts";

export { type Split, parseSplits, serializeSplits, splitsExtension } from
  "./splits.ts";

export { parseBudget, serializeBudget, budgetExtension } from "./budget.ts";

export {
  type FilterAmountGroup,
  type FilterDateGroup,
  type FilterGroups,
  type FilterKeyGroup,
  type FilterPaymodeGroup,
  type FilterStatusGroup,
  type FilterTextGroup,
  type FilterTypeGroup,
  filterExtension,
  parseFilterGroups,
  serializeFilterGroups,
} from "./filter.ts";

export {
  conditionalDamtExtension,
  OF_ADVXFER,
  parseConditionalAmount,
  serializeConditionalAmount,
} from "./conditional.ts";
