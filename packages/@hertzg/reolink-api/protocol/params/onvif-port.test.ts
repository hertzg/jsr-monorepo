import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { onvifPort } from "./onvif-port.ts";

Deno.test("onvifPort decodes the cmd 37 reply element", () => {
  const root = parse(
    '<OnvifPort version="1.1"><onvifPort>8000</onvifPort><enable>1</enable></OnvifPort>',
  ).root;

  assertEquals(onvifPort.decode(root), { onvifPort: 8000, enable: 1 });
});

Deno.test("onvifPort round-trips a port and enable flag", () => {
  const value = { onvifPort: 8001, enable: 0 };

  assertEquals(onvifPort.decode(parse(onvifPort.encode(value)).root), value);
});

Deno.test("onvifPort writes only the port when enable is left out", () => {
  assertEquals(
    onvifPort.encode({ onvifPort: 8001 }),
    '<OnvifPort version="1.1"><onvifPort>8001</onvifPort></OnvifPort>',
  );
});
