import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { upgradeState } from "./upgrade-state.ts";

Deno.test("upgradeState decodes the reply net_online_update_state_s2x writes", () => {
  const root = parse(
    '<upgradeState version="1.1"><downloadSize>524288</downloadSize>' +
      "<packetSize>33554432</packetSize><state>downloading</state></upgradeState>",
  ).root;

  assertEquals(upgradeState.decode(root), {
    downloadSize: 524288,
    packetSize: 33554432,
    state: "downloading",
  });
});

Deno.test("upgradeState round-trips a full value", () => {
  const value = {
    downloadSize: 1024,
    packetSize: 2048,
    state: "imgerror" as const,
  };

  assertEquals(
    upgradeState.decode(parse(upgradeState.encode(value)).root),
    value,
  );
});

Deno.test("upgradeState reads none, the state the writer uses for an unknown number", () => {
  const root = parse(
    '<upgradeState version="1.1"><downloadSize>0</downloadSize>' +
      "<packetSize>0</packetSize><state>none</state></upgradeState>",
  ).root;

  assertEquals(upgradeState.decode(root).state, "none");
});

Deno.test("upgradeState rejects a state neither direction knows", () => {
  const root = parse(
    '<upgradeState version="1.1"><state>paused</state></upgradeState>',
  ).root;

  assertThrows(() => upgradeState.decode(root), Error, "paused");
});
