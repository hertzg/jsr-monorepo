/**
 * Reads live alerts from a device with this package and prints per-channel
 * motion on/off, treating 3 s without a VMD post as "off".
 *
 * Not published. Run from this directory:
 *
 *   HIK_HOST=192.0.2.10 HIK_USER=admin HIK_PASS=… deno run -A zz-alerts.ts [seconds]
 *
 * @module
 */

import { createClient } from "./mod.ts";

const host = Deno.env.get("HIK_HOST") ?? "192.0.2.10";
const username = Deno.env.get("HIK_USER") ?? "";
const password = Deno.env.get("HIK_PASS") ?? "";
const seconds = Number(Deno.args[0] ?? 60);
const offAfterMs = 3000;

const startedAt = Date.now();
const stamp = () => `+${((Date.now() - startedAt) / 1000).toFixed(1)}s`;

const client = createClient({ baseUrl: `http://${host}`, username, password });
const info = await client.deviceInfo();
console.log(stamp(), info.deviceType, info.model, info.firmwareVersion);

const alerts = await client.subscribe({
  signal: AbortSignal.timeout(seconds * 1000),
});
console.log(stamp(), "subscribed");

const lastActive = new Map<number, number>();
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [channel, at] of lastActive) {
    if (now - at < offAfterMs) continue;
    lastActive.delete(channel);
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
      if (!lastActive.has(alert.channel)) {
        console.log(stamp(), `D${alert.channel}`, "motion on", alert.dateTime);
      }
      lastActive.set(alert.channel, Date.parse(alert.at));
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
