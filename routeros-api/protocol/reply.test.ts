import { assertEquals, assertThrows } from "@std/assert";
import { isData, isDone, isFatal, isTrap, parseReply } from "./reply.ts";

Deno.test("parseReply - !done without attributes", () => {
  const result = parseReply(["!done"]);
  assertEquals(result, { type: "done" });
  assertEquals(isDone(result), true);
});

Deno.test("parseReply - !done with attributes", () => {
  const result = parseReply(["!done", "=tag=req-1"]);
  assertEquals(result, { type: "done", attributes: { tag: "req-1" } });
});

Deno.test("parseReply - !re data reply", () => {
  const result = parseReply([
    "!re",
    "=name=ether1",
    "=type=ether",
    "=mtu=1500",
  ]);
  assertEquals(result, {
    type: "re",
    attributes: {
      name: "ether1",
      type: "ether",
      mtu: "1500",
    },
  });
  assertEquals(isData(result), true);
});

Deno.test("parseReply - !re without attributes", () => {
  const result = parseReply(["!re"]);
  assertEquals(result, { type: "re", attributes: {} });
});

Deno.test("parseReply - !trap with message", () => {
  const result = parseReply([
    "!trap",
    "=message=no such item",
    "=category=2",
  ]);
  assertEquals(result, {
    type: "trap",
    message: "no such item",
    category: 2,
  });
  assertEquals(isTrap(result), true);
});

Deno.test("parseReply - !trap without category", () => {
  const result = parseReply([
    "!trap",
    "=message=invalid command",
  ]);
  assertEquals(result, {
    type: "trap",
    message: "invalid command",
    category: undefined,
  });
});

Deno.test("parseReply - !trap with extra attributes", () => {
  const result = parseReply([
    "!trap",
    "=message=error occurred",
    "=category=5",
    "=detail=extra info",
  ]);
  assertEquals(result, {
    type: "trap",
    message: "error occurred",
    category: 5,
    attributes: { detail: "extra info" },
  });
});

Deno.test("parseReply - !fatal", () => {
  const result = parseReply([
    "!fatal",
    "=message=connection lost",
  ]);
  assertEquals(result, {
    type: "fatal",
    message: "connection lost",
  });
  assertEquals(isFatal(result), true);
});

Deno.test("parseReply - !fatal without message", () => {
  const result = parseReply(["!fatal"]);
  assertEquals(result, {
    type: "fatal",
    message: "Fatal error",
  });
});

Deno.test("parseReply - empty words throws", () => {
  assertThrows(
    () => parseReply([]),
    Error,
    "Cannot parse empty reply",
  );
});

Deno.test("parseReply - unknown reply type throws", () => {
  assertThrows(
    () => parseReply(["!unknown"]),
    Error,
    "Unknown reply type",
  );
});

Deno.test("parseReply - attribute with equals in value", () => {
  const result = parseReply([
    "!re",
    "=comment=value=with=equals",
  ]);
  assertEquals(result, {
    type: "re",
    attributes: {
      comment: "value=with=equals",
    },
  });
});

Deno.test("parseReply - complex attributes", () => {
  const result = parseReply([
    "!re",
    "=.id=*1",
    "=name=ether1",
    "=disabled=false",
    "=running=true",
    "=comment=Main interface",
  ]);
  assertEquals(result, {
    type: "re",
    attributes: {
      ".id": "*1",
      name: "ether1",
      disabled: "false",
      running: "true",
      comment: "Main interface",
    },
  });
});

Deno.test("type guards work correctly", () => {
  const doneReply = parseReply(["!done"]);
  const dataReply = parseReply(["!re", "=name=test"]);
  const trapReply = parseReply(["!trap", "=message=error"]);
  const fatalReply = parseReply(["!fatal", "=message=fatal"]);

  assertEquals(isDone(doneReply), true);
  assertEquals(isData(doneReply), false);
  assertEquals(isTrap(doneReply), false);
  assertEquals(isFatal(doneReply), false);

  assertEquals(isDone(dataReply), false);
  assertEquals(isData(dataReply), true);
  assertEquals(isTrap(dataReply), false);
  assertEquals(isFatal(dataReply), false);

  assertEquals(isDone(trapReply), false);
  assertEquals(isData(trapReply), false);
  assertEquals(isTrap(trapReply), true);
  assertEquals(isFatal(trapReply), false);

  assertEquals(isDone(fatalReply), false);
  assertEquals(isData(fatalReply), false);
  assertEquals(isTrap(fatalReply), false);
  assertEquals(isFatal(fatalReply), true);
});
