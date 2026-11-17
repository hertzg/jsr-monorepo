# ADR 0001 - Interleaved data on an unclaimed channel is dropped

A `$` block for a Channel ID nobody claimed with `channel(channelId)` is
dropped and counted in `droppedBlocks`. The read loop never waits on it.

Responses and `$` blocks share one connection, so one read loop serves both.
A block that waits for a reader who never comes stalls every response behind
it.

```
state       entered by            a $ block for this ID is
unclaimed   default               dropped, droppedBlocks[id] += 1
claimed     channel(id)           enqueued, the read loop waits when the queue is full
unclaimed   readable.cancel()     dropped, droppedBlocks[id] += 1
```

A claimed channel holds one block. The cost is stated, not hidden: a claimed
channel nobody reads stalls the whole connection, responses included. The
caller reads it or cancels it.

Ruled out:

- Buffering unclaimed blocks until someone claims the channel. Media arrives
  faster than anyone decides to read it, so the buffer has no bound.
- Dropping on a full claimed channel. A reader that asked for the data and
  reads it slowly gets silent holes in a media stream.
