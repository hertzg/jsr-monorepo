import { assertEquals, assertThrows } from "@std/assert";
import { parse } from "@std/xml";
import { deviceInfo } from "./device-info.ts";

Deno.test("deviceInfo decodes an RLC-823A login reply", () => {
  const root = parse(
    '<DeviceInfo version="1.1"><firmVersion>firm-abc123</firmVersion>' +
      "<IOInputPortNum>1</IOInputPortNum><IOOutputPortNum>2</IOOutputPortNum>" +
      "<diskNum>3</diskNum><type>ipc</type><channelNum>4</channelNum>" +
      "<audioNum>5</audioNum><ipChannel>6</ipChannel><analogChnNum>7</analogChnNum>" +
      "<resolution><resolutionName>3840*2160</resolutionName>" +
      "<width>3840</width><height>2160</height></resolution>" +
      "<secretCode>secret-abc123</secretCode><language>English</language>" +
      "<sdCard>1</sdCard><ptzMode>ptz</ptzMode><typeInfo>type-abc123</typeInfo>" +
      "<softVer>8</softVer><hardVer>9</hardVer><panelVer>10</panelVer>" +
      "<hdChannel1>11</hdChannel1><hdChannel2>12</hdChannel2>" +
      "<hdChannel3>13</hdChannel3><hdChannel4>14</hdChannel4>" +
      "<norm>PAL</norm><osdFormat>YMD</osdFormat><B485>15</B485>" +
      "<supportAutoUpdate>16</supportAutoUpdate><userVer>1</userVer>" +
      "<FrameworkVer>17</FrameworkVer><authMode>18</authMode>" +
      "<binoType>19</binoType></DeviceInfo>",
  ).root;

  assertEquals(deviceInfo.decode(root), {
    firmVersion: "firm-abc123",
    IOInputPortNum: 1,
    IOOutputPortNum: 2,
    diskNum: 3,
    type: "ipc",
    channelNum: 4,
    audioNum: 5,
    ipChannel: 6,
    analogChnNum: 7,
    resolution: { resolutionName: "3840*2160", width: 3840, height: 2160 },
    secretCode: "secret-abc123",
    language: "English",
    sdCard: 1,
    ptzMode: "ptz",
    typeInfo: "type-abc123",
    softVer: 8,
    hardVer: 9,
    panelVer: 10,
    hdChannel1: 11,
    hdChannel2: 12,
    hdChannel3: 13,
    hdChannel4: 14,
    norm: "PAL",
    osdFormat: "YMD",
    B485: 15,
    supportAutoUpdate: 16,
    userVer: 1,
    FrameworkVer: 17,
    authMode: 18,
    binoType: 19,
  });
});

Deno.test("deviceInfo decodes an alertor reply without resolution or secret", () => {
  const root = parse(
    '<DeviceInfo version="1.1"><firmVersion>f</firmVersion>' +
      "<IOInputPortNum>0</IOInputPortNum><IOOutputPortNum>0</IOOutputPortNum>" +
      "<diskNum>0</diskNum><type>alertor</type><channelNum>0</channelNum>" +
      "<audioNum>0</audioNum><ipChannel>0</ipChannel><analogChnNum>0</analogChnNum>" +
      "<language>English</language><sdCard>0</sdCard><ptzMode>none</ptzMode>" +
      "<typeInfo>t</typeInfo><softVer>0</softVer><hardVer>0</hardVer>" +
      "<panelVer>0</panelVer><hdChannel1>0</hdChannel1><hdChannel2>0</hdChannel2>" +
      "<hdChannel3>0</hdChannel3><hdChannel4>0</hdChannel4><norm>NTSC</norm>" +
      "<osdFormat>MDY</osdFormat><B485>0</B485><supportAutoUpdate>0</supportAutoUpdate>" +
      "<userVer>1</userVer><FrameworkVer>0</FrameworkVer><authMode>0</authMode>" +
      "</DeviceInfo>",
  ).root;

  assertEquals("resolution" in deviceInfo.decode(root), false);
});

Deno.test("deviceInfo round-trips a doorbell reply through encode and decode", () => {
  const value = {
    firmVersion: "firm-rt",
    IOInputPortNum: 0,
    IOOutputPortNum: 0,
    diskNum: 1,
    type: "smart_bell" as const,
    channelNum: 1,
    audioNum: 1,
    ipChannel: 0,
    analogChnNum: 1,
    resolution: { resolutionName: "2560*1920", width: 2560, height: 1920 },
    secretCode: "secret-rt",
    bootSecret: "boot-rt",
    language: "English",
    sdCard: 1,
    ptzMode: "none" as const,
    typeInfo: "type-rt",
    softVer: 1,
    hardVer: 2,
    panelVer: 3,
    hdChannel1: 4,
    hdChannel2: 5,
    hdChannel3: 6,
    hdChannel4: 7,
    norm: "NTSC" as const,
    osdFormat: "MDY",
    B485: 0,
    supportAutoUpdate: 1,
    userVer: 1,
    FrameworkVer: 8,
    authMode: 9,
    sleep: 0,
    feature: 2,
    binoType: 10,
  };

  assertEquals(deviceInfo.decode(parse(deviceInfo.encode(value)).root), value);
});

Deno.test("deviceInfo throws on a ptzMode the firmware never writes", () => {
  const root = parse(
    '<DeviceInfo version="1.1"><firmVersion>f</firmVersion>' +
      "<IOInputPortNum>0</IOInputPortNum><IOOutputPortNum>0</IOOutputPortNum>" +
      "<diskNum>0</diskNum><type>ipc</type><channelNum>0</channelNum>" +
      "<audioNum>0</audioNum><ipChannel>0</ipChannel><analogChnNum>0</analogChnNum>" +
      "<language>English</language><sdCard>0</sdCard><ptzMode>zoom</ptzMode>" +
      "</DeviceInfo>",
  ).root;

  assertThrows(() => deviceInfo.decode(root), Error, "zoom");
});
