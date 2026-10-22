/**
 * The alert stream of one device as a `ReadableStream` of {@link Alert}s.
 *
 * `GET /ISAPI/Event/notification/alertStream` answers
 * `200 multipart/mixed;boundary=boundary` and keeps the connection open,
 * posting one XML part per alert. {@link openAlertStream} sends that request,
 * splits the body into parts and parses every XML part into an
 * {@link Alert}. Parts that are not XML are skipped: with picture upload on,
 * a smart event's XML part is followed by an image part, `image/jpeg` or
 * `image/pjpeg`.
 *
 * ```
 * fetch alertStream ─> body bytes ─> parts ─> XML parts ─> Alert
 * ```
 *
 * The heartbeat, `videoloss inactive` about every 10 s, comes through as an
 * alert like any other. An NVR holds it back while alerts flow; a camera
 * does not. A liveness check should therefore count every alert, not only
 * heartbeats.
 *
 * The stream ends when the device closes the connection or the `signal`
 * aborts; aborting closes it cleanly rather than erroring it. It ends on
 * the signal by cancelling its own reader and does not rely on the runtime
 * erroring the fetch body (ADR 0002). It never reconnects: a consumer that
 * wants to stay subscribed opens a new stream when this one ends, with
 * whatever backoff suits it.
 *
 * @example Print motion alerts until Ctrl-C
 * ```ts ignore
 * import { openAlertStream } from "@hertzg/hikvision-api/events/stream";
 *
 * const controller = new AbortController();
 * process.on("SIGINT", () => controller.abort());
 *
 * const alerts = await openAlertStream({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   signal: controller.signal,
 * });
 *
 * for await (const alert of alerts) {
 *   if (alert.eventType === "VMD") {
 *     console.log(alert.at, `channel ${alert.channel} motion`);
 *   }
 * }
 * ```
 *
 * @module
 */

import {
  createPartsStream,
  parseBoundary,
  type Part,
} from "../multipart/parts.ts";
import { request, type RequestOptions } from "../request.ts";
import { parseIsapi } from "../xml.ts";
import { type Alert, parseAlert } from "./alert.ts";

/** The alert stream path. */
export const ALERT_STREAM_PATH = "/ISAPI/Event/notification/alertStream";

/** Options for {@link openAlertStream}. */
export type AlertStreamOptions = RequestOptions & {
  /** Aborting it ends the stream. */
  signal?: AbortSignal;
};

/**
 * Opens the device's alert stream.
 *
 * Resolves once the device has answered the request, so a wrong password
 * or an unsupported device fails here, not on the first read.
 *
 * @param options Where the device is, how to log in, and the signal that ends the stream.
 * @returns A stream of alerts in the order the device posted them.
 * @throws {HttpError} When the device answers with a status outside 2xx, such as 401.
 * @throws {IsapiError} When the device answers 200 with a failing `<ResponseStatus>`.
 * @throws {Error} When the reply is neither multipart nor a `<ResponseStatus>`.
 *
 * @example Read a canned stream through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { openAlertStream } from "@hertzg/hikvision-api/events/stream";
 *
 * const xml = "<EventNotificationAlert><dynChannelID>3</dynChannelID>" +
 *   "<dateTime>2026-10-21T20:44:39</dateTime><eventType>VMD</eventType>" +
 *   "<eventState>active</eventState></EventNotificationAlert>";
 * const body = `--boundary\r\nContent-Type: application/xml; charset="UTF-8"\r\n` +
 *   `Content-Length: ${xml.length}\r\n\r\n${xml}\r\n`;
 * const fetch = spy(resolvesNext([
 *   new Response(body, { headers: { "content-type": "multipart/mixed;boundary=boundary" } }),
 * ]));
 *
 * const alerts = await openAlertStream({
 *   baseUrl: "http://192.0.2.10",
 *   username: "admin",
 *   password: "hunter2",
 *   fetch,
 * });
 * const [alert] = await Array.fromAsync(alerts);
 *
 * assertEquals(alert.channel, 3);
 * assertEquals(alert.eventType, "VMD");
 * ```
 */
export async function openAlertStream(
  options: AlertStreamOptions,
): Promise<ReadableStream<Alert>> {
  const { signal, ...requestOptions } = options;
  const response = await request(requestOptions, ALERT_STREAM_PATH, {
    signal,
  });
  const contentType = response.headers.get("content-type");
  const boundary = parseBoundary(contentType);
  if (boundary === undefined || response.body === null) {
    const body = await response.text();
    parseIsapi(body);
    throw new Error(
      `ISAPI ${ALERT_STREAM_PATH} answered ${contentType}, not multipart`,
    );
  }
  const decoder = new TextDecoder();
  const reader = response.body
    .pipeThrough(createPartsStream(boundary))
    .pipeThrough(
      new TransformStream<Part, Alert>({
        transform(part, controller) {
          if (!isXml(part)) {
            return;
          }
          const xml = decoder.decode(part.body);
          if (xml.includes("<EventNotificationAlert")) {
            controller.enqueue(parseAlert(xml, new Date().toISOString()));
          }
        },
      }),
    )
    .getReader();
  // The signal is also given to fetch, but the stream does not rely on
  // fetch erroring the body (ADR 0002): on abort it cancels its own reader, which
  // resolves a pending read as done and cancels the response body, so the
  // consumer's loop ends and the connection is dropped either way.
  signal?.addEventListener("abort", () => {
    reader.cancel(signal.reason).catch(() => {});
  }, { once: true });
  return new ReadableStream<Alert>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        if (signal?.aborted) {
          controller.close();
        } else {
          controller.error(error);
        }
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

function isXml(part: Part): boolean {
  const type = part.headers.get("content-type") ?? "";
  return /xml/i.test(type);
}
