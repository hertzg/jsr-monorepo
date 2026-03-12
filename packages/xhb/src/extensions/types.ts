/**
 * Shared types for entity extension handlers.
 *
 * Extensions hook into the schema parse/serialize system to handle fields
 * that don't follow the standard attribute-to-field pattern (e.g. splits,
 * budget arrays, filter groups, conditional fields).
 */

/**
 * An extension that adds custom parse and serialize logic for entity fields
 * that require special handling beyond simple attribute mapping.
 */
export interface EntityExtension {
  /**
   * Receives raw XML attributes and the partially-parsed entity, then adds
   * extension-managed fields to the entity.
   *
   * @param attrs Raw XML attribute key-value pairs
   * @param entity The partially-parsed entity being constructed
   */
  parse: (
    attrs: Record<string, string>,
    entity: Record<string, unknown>,
  ) => void;

  /**
   * Receives the entity and returns additional XML attribute strings
   * (like `key="value"`) to append during serialization.
   *
   * @param entity The entity being serialized
   * @returns Array of XML attribute strings to append
   */
  serialize: (entity: Record<string, unknown>) => string[];
}
