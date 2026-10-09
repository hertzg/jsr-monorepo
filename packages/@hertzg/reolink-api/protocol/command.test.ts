import { assertEquals, assertThrows } from "@std/assert";
import { command, decodeCommandBody, encodeCommandBody } from "./command.ts";
import { int, xmlParam } from "./xml.ts";

Deno.test("encodeCommandBody writes only the parameters given", () => {
  const ports = command(36, "SET_NETPORT_CFG_V20", [
    xmlParam("HttpPort", { httpPort: int(), enable: int() }),
    xmlParam("RtspPort", { rtspPort: int(), enable: int() }),
  ]);

  assertEquals(
    encodeCommandBody(ports, { RtspPort: { rtspPort: 554, enable: 1 } }),
    '<?xml version="1.0" encoding="UTF-8" ?>\n<body>' +
      '<RtspPort version="1.1"><rtspPort>554</rtspPort><enable>1</enable></RtspPort>' +
      "</body>\n",
  );
});

Deno.test("encodeCommandBody writes parameters in the command's order", () => {
  const ports = command(36, "SET_NETPORT_CFG_V20", [
    xmlParam("HttpPort", { httpPort: int() }),
    xmlParam("RtspPort", { rtspPort: int() }),
  ]);

  const xml = encodeCommandBody(ports, {
    RtspPort: { rtspPort: 554 },
    HttpPort: { httpPort: 80 },
  });

  assertEquals(xml.indexOf("<HttpPort") < xml.indexOf("<RtspPort"), true);
});

Deno.test("encodeCommandBody gives an empty string for no parameters", () => {
  const ports = command(37, "GET_NETPORT_CFG_V20", [
    xmlParam("RtspPort", { rtspPort: int() }),
  ]);

  assertEquals(encodeCommandBody(ports, {}), "");
});

Deno.test("decodeCommandBody reads every declared parameter present", () => {
  const ports = command(37, "GET_NETPORT_CFG_V20", [
    xmlParam("ServerPort", { serverPort: int(), enable: int() }),
    xmlParam("RtmpPort", { rtmpPort: int(), enable: int() }),
  ]);
  const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n<body>\n' +
    '<ServerPort version="1.1"><serverPort>9000</serverPort><enable>1</enable></ServerPort>\n' +
    "</body>\n";

  assertEquals(decodeCommandBody(ports, xml), {
    ServerPort: { serverPort: 9000, enable: 1 },
  });
});

Deno.test("decodeCommandBody reads an empty body as no parameters", () => {
  const reboot = command(23, "REBOOT_V20", []);

  assertEquals(decodeCommandBody(reboot, ""), {});
});

Deno.test("decodeCommandBody throws when a parameter misses a required field", () => {
  const ports = command(37, "GET_NETPORT_CFG_V20", [
    xmlParam("ServerPort", { serverPort: int(), enable: int() }),
  ]);

  assertThrows(
    () =>
      decodeCommandBody(
        ports,
        "<body><ServerPort><enable>1</enable></ServerPort></body>",
      ),
    Error,
    "<ServerPort> has no <serverPort>",
  );
});
