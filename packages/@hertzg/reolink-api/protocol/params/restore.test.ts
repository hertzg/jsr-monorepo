import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { restore } from "./restore.ts";

Deno.test("restore decodes every flag the firmware reads", () => {
  const root = parse(
    '<Restore version="1.1"><all>0</all><display>1</display><recording>0</recording>' +
      "<network>1</network><alarm>0</alarm><device>1</device><system>0</system>" +
      "<wifi>1</wifi><IPC>0</IPC></Restore>",
  ).root;

  assertEquals(restore.decode(root), {
    all: 0,
    display: 1,
    recording: 0,
    network: 1,
    alarm: 0,
    device: 1,
    system: 0,
    wifi: 1,
    IPC: 0,
  });
});

Deno.test("restore round-trips through encode and decode", () => {
  const value = { all: 1, wifi: 0, IPC: 1 };

  assertEquals(restore.decode(parse(restore.encode(value)).root), value);
});

Deno.test("restore encodes only the flags that are set", () => {
  assertEquals(
    restore.encode({ all: 1 }),
    '<Restore version="1.1"><all>1</all></Restore>',
  );
});
