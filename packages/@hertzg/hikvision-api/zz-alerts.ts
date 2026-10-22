/**
 * Reads live alerts from a device with this package and prints per-channel
 * motion on/off, treating 3 s without a VMD post as "off".
 *
 * Not published. Run from this directory, on Deno or Bun:
 *
 *   HIK_HOST=192.0.2.10 HIK_USER=admin HIK_PASS=… deno run -A zz-alerts.ts 30
 *   HIK_HOST=192.0.2.10 HIK_USER=admin HIK_PASS=… bun run zz-alerts.ts 30
 *
 * @module
 */

import process from "node:process";
import { alertStream, deviceInfo, request, stream } from "./mod.ts";

const host = process.env.HIK_HOST ?? "192.0.2.10";
const username = process.env.HIK_USER ?? "";
const password = process.env.HIK_PASS ?? "";
const seconds = Number(process.argv[2] ?? 60);

/**
 * A channel's motion ends when no `VMD active` post arrived for this long.
 * Devices post about once a second while motion lasts and never post
 * `inactive`. Raise it when one walk past a camera shows as two events;
 * lower it when visits blur together. pyHik uses 5000, Scrypted 20000.
 */
const MOTION_OFF_AFTER_MS = 3000;

const startedAt = Date.now();
const stamp = () => `+${((Date.now() - startedAt) / 1000).toFixed(1)}s`;

const device = { baseUrl: `http://${host}`, username, password };
const info = await request(device, deviceInfo);
console.log(stamp(), info.deviceType, info.model, info.firmwareVersion);

const alerts = await stream(device, alertStream, {
  signal: AbortSignal.timeout(seconds * 1000),
});
console.log(stamp(), "subscribed");

const lastActiveMs = new Map<number, number>();
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [channel, atMs] of lastActiveMs) {
    if (now - atMs < MOTION_OFF_AFTER_MS) continue;
    lastActiveMs.delete(channel);
    console.log(stamp(), `D${channel}`, "motion off (silence)");
  }
}, 500);

let posts = 0;
let heartbeats = 0;
try {
  for await (const alert of alerts) {
    if (alert.eventType === "videoloss" && alert.eventState === "inactive") {
      heartbeats++;
      continue;
    }
    posts++;
    if (alert.eventType === "VMD" && alert.eventState === "active") {
      if (!lastActiveMs.has(alert.channel)) {
        console.log(stamp(), `D${alert.channel}`, "motion on", alert.dateTime);
      }
      lastActiveMs.set(alert.channel, Date.parse(alert.at));
    } else {
      console.log(
        stamp(),
        `D${alert.channel}`,
        alert.eventType,
        alert.eventState,
      );
    }
  }
} finally {
  clearInterval(sweep);
}
console.log(stamp(), `done: ${posts} posts, ${heartbeats} heartbeats`);
