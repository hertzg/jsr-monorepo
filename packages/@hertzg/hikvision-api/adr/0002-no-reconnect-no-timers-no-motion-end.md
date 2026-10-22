# ADR 0002 - The stream ends when the device or the signal says so; nothing else is inferred

`openAlertStream` sends one request and yields alerts until the device
closes the connection or the caller's `AbortSignal` fires. It does not
reconnect, keeps no timers, and does not decide that motion has stopped.
On abort it ends by cancelling its own reader; it does not rely on the
runtime erroring the fetch body (Deno 2.9.x: denoland/deno#36982, #37006).

Devices post `VMD active` about once a second while motion lasts and never
post `VMD inactive`; motion ends in silence. The heartbeat (`videoloss
inactive`, every 10 s) pauses while alerts flow on an NVR, not on a camera.

```
device   VMD active  VMD active  VMD active  ……silence……
client   Alert{at}   Alert{at}   Alert{at}   (nothing: no timer)
caller   motion on                           motion off after N s of no alert
```

Every alert carries `at`, its arrival time. N, liveness and backoff are
policy, and policy belongs to the caller, who measures from `at`.

Ruled out:

- Faking `VMD inactive` after a timeout: one caller's number, a lie on the wire.
- Reconnecting inside the stream. Backoff and liveness are the caller's.
