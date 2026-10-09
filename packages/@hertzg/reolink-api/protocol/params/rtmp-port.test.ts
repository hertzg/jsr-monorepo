import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { rtmpPort } from "./rtmp-port.ts";

Deno.test("rtmpPort decodes the cmd 37 reply element", () => {
  const root = parse(
    '<RtmpPort version="1.1"><rtmpPort>1935</rtmpPort><enable>1</enable></RtmpPort>',
  ).root;

  assertEquals(rtmpPort.decode(root), { rtmpPort: 1935, enable: 1 });
});

Deno.test("rtmpPort round-trips a port and enable flag", () => {
  const value = { rtmpPort: 1936, enable: 0 };

  assertEquals(rtmpPort.decode(parse(rtmpPort.encode(value)).root), value);
});

Deno.test("rtmpPort writes only the port when enable is left out", () => {
  assertEquals(
    rtmpPort.encode({ rtmpPort: 1936 }),
    '<RtmpPort version="1.1"><rtmpPort>1936</rtmpPort></RtmpPort>',
  );
});
