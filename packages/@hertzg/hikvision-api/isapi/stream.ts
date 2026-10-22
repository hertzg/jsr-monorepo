/**
 * A streamed ISAPI resource as a `ReadableStream` of decoded documents.
 *
 * Some paths answer `200 multipart/mixed` and keep the connection open,
 * posting one part per event. {@link stream} sends that request, splits
 * the body into parts and decodes every XML part with the resource's
 * codec. Parts that are not XML are skipped: with picture upload on, a
 * smart event's XML part is followed by an image part, `image/jpeg` or
 * `image/pjpeg`.
 *
 * ```
 * request ─> body bytes ─> parts ─> XML parts ─> codec ─> T, T, …
 * ```
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
 * import { alertStream } from "./event/alert.ts";
 * import { stream } from "./stream.ts";
 *
 * const controller = new AbortController();
 * process.on("SIGINT", () => controller.abort());
 * const nvr = { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2" };
 *
 * for await (const alert of await stream(nvr, alertStream, { signal: controller.signal })) {
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
} from "../http/multipart.ts";
import { type Device, resolveUrl, send } from "../http/request.ts";
import type { Resource } from "./request.ts";
import { findResponseStatus, IsapiError, parseIsapi } from "./status.ts";

/** Options for {@link stream}. */
export type StreamOptions = {
  /** Aborting it ends the stream. */
  signal?: AbortSignal;
};

/**
 * Opens a streamed resource.
 *
 * Resolves once the device has answered the request, so a wrong password
 * or an unsupported device fails here, not on the first read.
 *
 * @template T The decoded value of one part.
 * @param device Where the device is and how to log in.
 * @param resource What to stream and how to decode each part.
 * @param options The signal that ends the stream.
 * @returns A stream of decoded parts in the order the device posted them.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 * @throws {Error} When the reply is neither multipart nor a `<ResponseStatus>`.
 *
 * @example Read a canned stream through a stubbed fetch
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { alertStream } from "./event/alert.ts";
 * import { stream } from "./stream.ts";
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
 * const alerts = await stream(
 *   { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *   alertStream,
 * );
 * const [alert] = await Array.fromAsync(alerts);
 *
 * assertEquals(alert.channel, 3);
 * assertEquals(alert.eventType, "VMD");
 * ```
 */
export async function stream<T>(
  device: Device,
  resource: Resource<T>,
  options: StreamOptions = {},
): Promise<ReadableStream<T>> {
  const { signal } = options;
  const response = await send(device, resource.path, { signal });
  if (!response.ok) {
    throw new IsapiError({
      url: resolveUrl(device, resource.path),
      httpStatus: response.status,
      status: findResponseStatus(await response.text()),
    });
  }
  const contentType = response.headers.get("content-type");
  const boundary = parseBoundary(contentType);
  if (boundary === undefined || response.body === null) {
    parseIsapi(await response.text());
    throw new Error(
      `ISAPI ${resource.path} answered ${contentType}, not multipart`,
    );
  }
  const decoder = new TextDecoder();
  const reader = response.body
    .pipeThrough(createPartsStream(boundary))
    .pipeThrough(
      new TransformStream<Part, T>({
        transform(part, controller) {
          if (isXml(part)) {
            controller.enqueue(resource.codec.parse(decoder.decode(part.body)));
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
  return new ReadableStream<T>({
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
