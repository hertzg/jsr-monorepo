/**
 * GLib type aliases mapping C/GLib types to TypeScript equivalents.
 *
 * These mirror the types used in HomeBank's C source code. Amounts
 * ({@linkcode gDouble}) are kept as strings to avoid floating-point
 * precision loss.
 */

/** Signed 16-bit integer. */
export type gShort = number;

/** Unsigned 16-bit integer. */
export type gUShort = number;

/** Signed 32-bit integer. */
export type gInt = number;

/** Unsigned 32-bit integer. */
export type gUInt32 = number;

/** Null-terminated string (C `gchar *`). */
export type gCharP = string;

/**
 * Double-precision floating-point value stored as a string.
 *
 * HomeBank amounts are preserved as strings to avoid JavaScript
 * floating-point precision issues during round-trip serialization.
 */
export type gDouble = string;

/** Boolean stored as a number (0 or 1). */
export type gBoolean = number;
