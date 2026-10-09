import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { httpPort } from "./http-port.ts";

Deno.test("httpPort decodes the cmd 37 reply element", () => {
  const root = parse(
    '<HttpPort version="1.1"><httpPort>80</httpPort><enable>1</enable></HttpPort>',
  ).root;

  assertEquals(httpPort.decode(root), { httpPort: 80, enable: 1 });
});

Deno.test("httpPort round-trips a port and enable flag", () => {
  const value = { httpPort: 8080, enable: 0 };

  assertEquals(httpPort.decode(parse(httpPort.encode(value)).root), value);
});

Deno.test("httpPort writes only the port when enable is left out", () => {
  assertEquals(
    httpPort.encode({ httpPort: 8080 }),
    '<HttpPort version="1.1"><httpPort>8080</httpPort></HttpPort>',
  );
});
