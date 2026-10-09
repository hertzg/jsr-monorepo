import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { wifi } from "./wifi.ts";

Deno.test("wifi decodes an RLC-823A cmd 116 reply with scanned access points", () => {
  const root = parse(
    '<Wifi version="1.1"><freqPolicy>1</freqPolicy><protocol>2</protocol>' +
      "<mode>station</mode><udidList>" +
      "<udid><name>HomeNet</name><signal>80</signal><encrypt>3</encrypt>" +
      "<type>4</type><protocol>5</protocol></udid>" +
      "<udid><name>Neighbour</name><signal>20</signal><encrypt>6</encrypt>" +
      "<type>7</type><protocol>8</protocol></udid>" +
      "</udidList><ssid>HomeNet</ssid><key>secret-key</key>" +
      "<channel>11</channel><type>9</type><staticSsid>KitNet</staticSsid>" +
      "<staticKey>kit-key</staticKey><countryCode>US</countryCode></Wifi>",
  ).root;

  assertEquals(wifi.decode(root), {
    freqPolicy: 1,
    protocol: 2,
    mode: "station",
    udidList: [
      { name: "HomeNet", signal: 80, encrypt: 3, type: 4, protocol: 5 },
      { name: "Neighbour", signal: 20, encrypt: 6, type: 7, protocol: 8 },
    ],
    ssid: "HomeNet",
    key: "secret-key",
    channel: 11,
    type: 9,
    staticSsid: "KitNet",
    staticKey: "kit-key",
    countryCode: "US",
  });
});

Deno.test("wifi decodes a reply without mode, access points or kit fields", () => {
  const root = parse(
    '<Wifi version="1.1"><freqPolicy>0</freqPolicy><protocol>0</protocol>' +
      "<ssid>HomeNet</ssid><key>secret-key</key><channel>6</channel>" +
      "<type>0</type><countryCode>DE</countryCode></Wifi>",
  ).root;

  assertEquals(wifi.decode(root), {
    freqPolicy: 0,
    protocol: 0,
    ssid: "HomeNet",
    key: "secret-key",
    channel: 6,
    type: 0,
    countryCode: "DE",
  });
});

Deno.test("wifi writes the parse-only auth and encryption fields", () => {
  const xml = wifi.encode({ authMode: "wpapsk", encryptType: "tkip" });

  assertEquals(
    xml,
    '<Wifi version="1.1"><authMode>wpapsk</authMode>' +
      "<encryptType>tkip</encryptType></Wifi>",
  );
});

Deno.test("wifi writes the access point list as udid items", () => {
  const xml = wifi.encode({ udidList: [{ name: "HomeNet", signal: 70 }] });

  assertStringIncludes(
    xml,
    "<udidList><udid><name>HomeNet</name><signal>70</signal></udid></udidList>",
  );
});

Deno.test("wifi rejects a mode the firmware does not know", () => {
  const root = parse('<Wifi version="1.1"><mode>mesh</mode></Wifi>').root;

  assertThrows(() => wifi.decode(root), Error, "expected one of station, ap");
});

Deno.test("wifi round-trips through encode and decode", () => {
  const value = {
    freqPolicy: 2,
    protocol: 1,
    mode: "ap" as const,
    authMode: "wpa2psk" as const,
    encryptType: "aes" as const,
    udidList: [{ name: "Cafe", signal: 55, encrypt: 1, type: 2, protocol: 3 }],
    ssid: "Office",
    key: "office-key",
    channel: 36,
    type: 4,
    staticSsid: "Fallback",
    staticKey: "fallback-key",
    countryCode: "GB",
  };

  const xml = wifi.encode(value);

  assertEquals(wifi.decode(parse(xml).root), value);
});

Deno.test("wifi decodes a Video Doorbell PoE cmd 116 reply without protocol or type", () => {
  const root = parse(
    '<Wifi version="1.1"><freqPolicy>1</freqPolicy><mode>station</mode>' +
      "<udidList>" +
      "<udid><name>HomeNet</name><signal>80</signal><encrypt>3</encrypt>" +
      "<type>4</type></udid>" +
      "<udid><name>Neighbour</name><signal>20</signal><encrypt>6</encrypt>" +
      "<type>7</type></udid>" +
      "</udidList><ssid>HomeNet</ssid><key>secret-key</key>" +
      "<channel>11</channel><countryCode>US</countryCode></Wifi>",
  ).root;

  assertEquals(wifi.decode(root), {
    freqPolicy: 1,
    mode: "station",
    udidList: [
      { name: "HomeNet", signal: 80, encrypt: 3, type: 4 },
      { name: "Neighbour", signal: 20, encrypt: 6, type: 7 },
    ],
    ssid: "HomeNet",
    key: "secret-key",
    channel: 11,
    countryCode: "US",
  });
});

Deno.test("wifi round-trips a Video Doorbell PoE request with scanAp", () => {
  const value = { scanAp: 1, ssid: "HomeNet", key: "secret-key" };

  const xml = wifi.encode(value);

  assertEquals(wifi.decode(parse(xml).root), value);
});
