# ADR 0002 - The stream ends when the device or the signal says so; nothing else is inferred

`openAlertStream` sends one request and yields alerts until the device
closes the connection or the caller's `AbortSignal` fires. It does not
reconnect, keeps no timers, and does not decide that motion has stopped.

Devices post `VMD active` about once a second while motion lasts and never
post `inactive`; the end of motion is silence. The heartbeat
(`videoloss inactive`, every 10 s) is suppressed while alerts flow. Both
thresholds are policy, and a policy belongs to the consumer:

```
device   VMD active  VMD active  VMD active  ……silence……
client   Alert{at}   Alert{at}   Alert{at}   (nothing: no timer)
caller   motion on                           motion off after N s of no alert
```

So every alert carries `at`, its arrival time, and the caller measures from
it. Same split as `@hertzg/reolink-api`: the client reads the protocol,
the wrapper owns reconnects and backoff.

Ruled out:

- A `motionTimeoutMs` option that synthesizes `VMD inactive`. It would be
  one consumer's number baked into the package, and a lie on the wire.
- Reconnecting inside the stream. Backoff and liveness are the caller's.
