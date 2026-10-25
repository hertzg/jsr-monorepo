/**
 * Reading the boundary out of a `multipart/*` content type.
 *
 * @module
 */

/**
 * The boundary named by a `multipart/*` content type.
 *
 * Hikvision devices write `boundary=boundary`. Leading dashes in the value
 * are dropped, since the delimiter on the wire is `--` plus the boundary.
 * Older NVRs are known to name one boundary here and write the literal
 * `--boundary` on the wire; this reads the header as sent and does not
 * paper over that.
 *
 * @param contentType The response's `Content-Type` header value.
 * @returns The boundary, or `undefined` when the header names none.
 *
 * @example Read the boundary from a content type
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseBoundary } from "./parse-boundary.ts";
 *
 * assertEquals(parseBoundary("multipart/mixed;boundary=boundary"), "boundary");
 * assertEquals(parseBoundary('multipart/mixed; boundary="--boundary"'), "boundary");
 * assertEquals(parseBoundary("application/xml"), undefined);
 * ```
 */
export function parseBoundary(contentType: string | null): string | undefined {
  const match = contentType?.match(/boundary="?([^";]+)"?/i);
  return match?.[1].replace(/^-+/, "");
}
