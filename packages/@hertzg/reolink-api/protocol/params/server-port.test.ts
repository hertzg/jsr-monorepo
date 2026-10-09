import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { serverPort } from "./server-port.ts";

Deno.test("serverPort decodes the cmd 37 reply element", () => {
  const root = parse(
    '<ServerPort version="1.1"><serverPort>9000</serverPort><enable>1</enable></ServerPort>',
  ).root;

  assertEquals(serverPort.decode(root), { serverPort: 9000, enable: 1 });
});

Deno.test("serverPort round-trips a port and enable flag", () => {
  const value = { serverPort: 9010, enable: 0 };

  assertEquals(serverPort.decode(parse(serverPort.encode(value)).root), value);
});

Deno.test("serverPort writes only the port when enable is left out", () => {
  assertEquals(
    serverPort.encode({ serverPort: 9010 }),
    '<ServerPort version="1.1"><serverPort>9010</serverPort></ServerPort>',
  );
});
