/**
 * The alert stream resource, `/ISAPI/Event/notification/alertStream`.
 *
 * @module
 */

import { defineDocument } from "../document/define-document.ts";
import type { Resource } from "../request.ts";
import { type Alert, decodeAlert } from "./decode-alert.ts";

/**
 * The alert stream: `GET /ISAPI/Event/notification/alertStream`, a
 * `multipart/mixed` response that never ends, one `<EventNotificationAlert>`
 * per part. Each alert is stamped with `at`, the time its part was decoded,
 * which is the time it arrived.
 *
 * @example The resource names the stream path
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { alertStream } from "./alert-stream.ts";
 *
 * assertEquals(alertStream.path, "/ISAPI/Event/notification/alertStream");
 * ```
 */
export const alertStream: Resource<Alert> = {
  path: "/ISAPI/Event/notification/alertStream",
  codec: defineDocument((root) => decodeAlert(root, new Date().toISOString())),
};
