import { assertEquals } from "@std/assert";
import { parse } from "@std/xml";
import { rtspPort } from "./rtsp-port.ts";

Deno.test("rtspPort decodes the cmd 37 reply element", () => {
  const root = parse(
    '<RtspPort version="1.1"><rtspPort>554</rtspPort><enable>1</enable></RtspPort>',
  ).root;

  assertEquals(rtspPort.decode(root), { rtspPort: 554, enable: 1 });
});

Deno.test("rtspPort round-trips a port and enable flag", () => {
  const value = { rtspPort: 8554, enable: 0 };

  assertEquals(rtspPort.decode(parse(rtspPort.encode(value)).root), value);
});

Deno.test("rtspPort writes only the port when enable is left out", () => {
  assertEquals(
    rtspPort.encode({ rtspPort: 8554 }),
    '<RtspPort version="1.1"><rtspPort>8554</rtspPort></RtspPort>',
  );
});
