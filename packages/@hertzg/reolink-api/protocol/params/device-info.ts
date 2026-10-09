/**
 * `<DeviceInfo>`: the device's type, port counts, firmware build and video
 * norm, as a successful cmd 1 (`LOGIN`) replies.
 *
 * Firmware: `net_xml_device_info_s2x` writes every field from `firmVersion`
 * to `authMode` always, except `resolution` and `secretCode`, which it skips
 * for an `alertor`. It writes `binoType` only when the device has one. The
 * Video Doorbell PoE build also writes `bootSecret` and `sleep` always, and
 * `feature` only when the device supports the AI YUV stream; the RLC-823A
 * build writes none of the three. There is no parser: the device never
 * reads this element.
 *
 * @example Read a cmd 1 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { deviceInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<DeviceInfo version="1.1"><firmVersion>00000000000000</firmVersion>' +
 *     "<IOInputPortNum>0</IOInputPortNum><IOOutputPortNum>0</IOOutputPortNum>" +
 *     "<diskNum>1</diskNum><type>ipc</type><channelNum>1</channelNum>" +
 *     "<audioNum>1</audioNum><ipChannel>0</ipChannel><analogChnNum>1</analogChnNum>" +
 *     "<resolution><resolutionName>3840*2160</resolutionName>" +
 *     "<width>3840</width><height>2160</height></resolution>" +
 *     "<secretCode>0</secretCode><language>English</language><sdCard>1</sdCard>" +
 *     "<ptzMode>ptz</ptzMode><typeInfo>IPC</typeInfo><softVer>50331917</softVer>" +
 *     "<hardVer>0</hardVer><panelVer>0</panelVer><hdChannel1>0</hdChannel1>" +
 *     "<hdChannel2>0</hdChannel2><hdChannel3>0</hdChannel3><hdChannel4>0</hdChannel4>" +
 *     "<norm>PAL</norm><osdFormat>YMD</osdFormat><B485>0</B485>" +
 *     "<supportAutoUpdate>1</supportAutoUpdate><userVer>1</userVer>" +
 *     "<FrameworkVer>1</FrameworkVer><authMode>0</authMode></DeviceInfo>",
 * ).root;
 *
 * assertEquals(deviceInfo.decode(root).ptzMode, "ptz");
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  oneOf,
  optional,
  text,
  uint,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The device identity and capabilities in `<DeviceInfo>`. */
export type DeviceInfo = {
  /** Firmware version string. */
  firmVersion: string;
  /** Number of alarm input ports. */
  IOInputPortNum: number;
  /** Number of alarm output ports. */
  IOOutputPortNum: number;
  /** Number of disks. */
  diskNum: number;
  /** Device class; the firmware writes `ipc` for an unknown class. */
  type:
    | "dvr"
    | "ipc"
    | "nvr"
    | "wifi_ipc"
    | "wifi_nvr"
    | "nxp_ipc"
    | "wifi_solo_ipc"
    | "base"
    | "alertor"
    | "smart_bell"
    | "smart_plug";
  /** Number of channels. */
  channelNum: number;
  /** Number of audio channels. */
  audioNum: number;
  /** Number of IP channels. */
  ipChannel: number;
  /** Number of analog channels. */
  analogChnNum: number;
  /** The sensor resolution; absent for an `alertor`. */
  resolution?: {
    /** Resolution name. */
    resolutionName: string;
    /** Width in pixels. */
    width: number;
    /** Height in pixels. */
    height: number;
  };
  /** Secret code; absent for an `alertor`. */
  secretCode?: string;
  /**
   * The same value as `secretCode`; Video Doorbell PoE only, written always
   * there.
   */
  bootSecret?: string;
  /** UI language name. */
  language: string;
  /** SD card slot flag. */
  sdCard: number;
  /** PTZ capability; `p` comes only from the RLC-823A build. */
  ptzMode: "none" | "af" | "ptz" | "pt" | "p";
  /** Free-form model type text. */
  typeInfo: string;
  /** Software version number. */
  softVer: number;
  /** Hardware version number. */
  hardVer: number;
  /** Panel version number. */
  panelVer: number;
  /** HD channel flag 1. */
  hdChannel1: number;
  /** HD channel flag 2. */
  hdChannel2: number;
  /** HD channel flag 3. */
  hdChannel3: number;
  /** HD channel flag 4. */
  hdChannel4: number;
  /** Video norm. */
  norm: "NTSC" | "PAL";
  /** OSD date format name. */
  osdFormat: string;
  /** RS-485 support flag. */
  B485: number;
  /** Online update support flag. */
  supportAutoUpdate: number;
  /** User protocol version; the firmware always writes 1. */
  userVer: number;
  /** Framework version number. */
  FrameworkVer: number;
  /** Authentication mode. */
  authMode: number;
  /** Sleep state; Video Doorbell PoE only, written always there. */
  sleep?: number;
  /**
   * Feature bits; Video Doorbell PoE only, written as 2 when the device
   * supports the AI YUV stream.
   */
  feature?: number;
  /** Binocular type; written only when the device has one. */
  binoType?: number;
};

/**
 * Codec for `<DeviceInfo>`.
 *
 * @example Round-trip a doorbell reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { deviceInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const value = {
 *   firmVersion: "firm-doorbell",
 *   IOInputPortNum: 0,
 *   IOOutputPortNum: 0,
 *   diskNum: 1,
 *   type: "smart_bell" as const,
 *   channelNum: 1,
 *   audioNum: 1,
 *   ipChannel: 0,
 *   analogChnNum: 1,
 *   resolution: { resolutionName: "2560*1920", width: 2560, height: 1920 },
 *   secretCode: "secret-doorbell",
 *   bootSecret: "secret-doorbell",
 *   language: "English",
 *   sdCard: 1,
 *   ptzMode: "none" as const,
 *   typeInfo: "type-doorbell",
 *   softVer: 1,
 *   hardVer: 2,
 *   panelVer: 3,
 *   hdChannel1: 0,
 *   hdChannel2: 0,
 *   hdChannel3: 0,
 *   hdChannel4: 0,
 *   norm: "NTSC" as const,
 *   osdFormat: "MDY",
 *   B485: 0,
 *   supportAutoUpdate: 1,
 *   userVer: 1,
 *   FrameworkVer: 1,
 *   authMode: 0,
 *   sleep: 0,
 *   feature: 2,
 * };
 *
 * assertEquals(deviceInfo.decode(parse(deviceInfo.encode(value)).root), value);
 * ```
 */
export const deviceInfo: XmlParam<"DeviceInfo", DeviceInfo> = xmlParam(
  "DeviceInfo",
  {
    firmVersion: text(),
    IOInputPortNum: int(),
    IOOutputPortNum: int(),
    diskNum: int(),
    type: oneOf(
      "dvr",
      "ipc",
      "nvr",
      "wifi_ipc",
      "wifi_nvr",
      "nxp_ipc",
      "wifi_solo_ipc",
      "base",
      "alertor",
      "smart_bell",
      "smart_plug",
    ),
    channelNum: int(),
    audioNum: int(),
    ipChannel: int(),
    analogChnNum: int(),
    resolution: optional(obj({
      resolutionName: text(),
      width: int(),
      height: int(),
    })),
    secretCode: optional(text()),
    bootSecret: optional(text()),
    language: text(),
    sdCard: int(),
    ptzMode: oneOf("none", "af", "ptz", "pt", "p"),
    typeInfo: text(),
    softVer: int(),
    hardVer: int(),
    panelVer: int(),
    hdChannel1: int(),
    hdChannel2: int(),
    hdChannel3: int(),
    hdChannel4: int(),
    norm: oneOf("NTSC", "PAL"),
    osdFormat: text(),
    B485: int(),
    supportAutoUpdate: int(),
    userVer: int(),
    FrameworkVer: int(),
    authMode: int(),
    sleep: optional(int()),
    feature: optional(uint()),
    binoType: optional(int()),
  },
);
