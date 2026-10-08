/**
 * Reolink camera client over Baichuan, Reolink's own TCP protocol (port 9000).
 *
 * Logs in and streams the camera's push events: doorbell presses, motion,
 * tamper and AI detections (people, vehicle, pet). The client is
 * environment-agnostic: the caller opens the socket and passes in its
 * streams, and reconnects by building a new client on a new socket.
 *
 * ```
 * TCP :9000 ─> nonce (cmd 1) ─> login (cmd 1) ─> AES session key
 *           ─> subscribe (cmd 31) ─> cmd 33 pushes ─> AlarmEvent stream
 * ```
 *
 * Every layer is its own entry point: `encoding/header`, `encoding/cipher`,
 * `protocol/message`, `protocol/login`, `protocol/event`, `streams/encode`,
 * `streams/decode` and `client`.
 *
 * @example Stream doorbell and motion events
 * ```ts ignore
 * import { createClient } from "@hertzg/reolink-client";
 *
 * const conn = await Deno.connect({ hostname: "192.168.1.10", port: 9000 });
 * const client = createClient({ readable: conn.readable, writable: conn.writable });
 *
 * await client.login({ username: "admin", password: "secret" });
 * const events = await client.subscribe();
 *
 * for await (const event of events) {
 *   // { channel: 0, motion: true, visitor: false, tamper: false, ai: ["people"] }
 *   console.log(event);
 * }
 *
 * await client.close();
 * conn.close();
 * ```
 *
 * @module
 */

export { createClient } from "./client.ts";
export type {
  Client,
  ClientOptions,
  LoginOptions,
  SubscribeOptions,
} from "./client.ts";
export type { AlarmEvent } from "./protocol/event.ts";
