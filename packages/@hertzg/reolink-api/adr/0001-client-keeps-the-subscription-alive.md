# ADR 0001 - The client keeps the event subscription alive, the caller reconnects

While `subscribe()`'s stream is open, the client pings the camera after
`keepAliveMs` of silence and errors the stream if a second interval passes
with nothing back. It never opens, reconnects or closes the socket.

A doorbell can sit idle all night, and the camera drops a TCP connection that
carries nothing. Only the client sees every byte, so only it knows when the
line went quiet:

```
silent for keepAliveMs  ->  cmd 93 (cmd 31 if no push has arrived yet)
still silent            ->  event stream errors
caller                  ->  new socket, createClient, login, subscribe
```

This mirrors reolink_aio's `_keepalive_loop`, minus its self-tuning interval:
a fixed option is easier to reason about and test.

Ruled out:

- A `ping()` method for the caller to time. Every consumer would rewrite the
  same loop, and none can see when the last byte arrived.
- Reconnecting inside the client. The socket belongs to the caller, as in
  `@hertzg/routeros-api`.
