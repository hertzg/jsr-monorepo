import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { httpsPort } from "./https-port.ts";

Deno.test("httpsPort decodes the cmd 37 reply element", () => {
  const root = parse(
    '<HttpsPort version="1.1"><httpsPort>443</httpsPort><enable>1</enable></HttpsPort>',
  ).root;

  assertEquals(httpsPort.decode(root), { httpsPort: 443, enable: 1 });
});

Deno.test("httpsPort round-trips a port and enable flag", () => {
  const value = { httpsPort: 8443, enable: 0 };

  assertEquals(httpsPort.decode(parse(httpsPort.encode(value)).root), value);
});

Deno.test("httpsPort writes only the port when enable is left out", () => {
  assertEquals(
    httpsPort.encode({ httpsPort: 8443 }),
    '<HttpsPort version="1.1"><httpsPort>8443</httpsPort></HttpsPort>',
  );
});
