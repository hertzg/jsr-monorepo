import { test } from "node:test";
import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { ircutMode } from "./ircut-mode.ts";

test("ircutMode decodes the cmd 166 reply", () => {
  const root = parse('<IrcutMode version="1.1"><mode>auto</mode></IrcutMode>')
    .root;

  assertEquals(ircutMode.decode(root), { mode: "auto" });
});

test("ircutMode round-trips through encode and decode", () => {
  const value = { mode: "ir" as const };

  assertEquals(ircutMode.decode(parse(ircutMode.encode(value)).root), value);
});

test("ircutMode rejects a mode the firmware does not write", () => {
  const root = parse("<IrcutMode><mode>off</mode></IrcutMode>").root;

  assertThrows(() => ircutMode.decode(root), Error, "auto, ir");
});
