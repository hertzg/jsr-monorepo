/**
 * `<Support>`: the feature flags and version numbers that tell a client
 * what the device can do, device-wide and per channel. Sent in the reply to
 * cmd 199.
 *
 * Firmware: `net_support_s2x` in the RLC-823A and the Video Doorbell PoE
 * firmware writes every device-wide field, always, except `recordCfg`,
 * which it writes only on battery models, and the fields only one of them
 * writes: `loginLocked` and `autoTest` (RLC-823A), `heightDiffAdjust` and
 * `user` (Video Doorbell PoE). It always writes `smartHome`, whose
 * `version` child appears only when bit 3 of `cloudVersion` is set and whose
 * `item`s appear only for a supported assistant. Then it writes one `<item>`
 * per channel; in it, `ipcAudioTalk` appears only on a multi-channel device
 * with `audioTalk` set, and `shelter` (always 0) only when the model has no
 * privacy mask support. Per channel, `aiAnimalType` and `thumbnail` are
 * RLC-823A only, and `eventTypeVersion`, `doorbellVersion`,
 * `aiUpdateAbility` and `remoteAbility` are Video Doorbell PoE only. Unless
 * noted, every numeric field is a flag or a feature version where 0 means
 * unsupported.
 *
 * @example Round-trip a single-channel cmd 199 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { support } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = support.encode({
 *   IOInputPortNum: 0, IOOutputPortNum: 0, diskNum: 1, channelNum: 1,
 *   audioNum: 1, ptzMode: "ptz", ptzCfg: 1, B485: 0, autoUpdate: 1,
 *   pushAlarm: 1, ftp: 1, ftpTest: 1, email: 1, wifi: 0, record: 1,
 *   wifiTest: 0, rtsp: 1, onvif: 1, audioTalk: 1, rfVersion: 0, rtmp: 1,
 *   noExternStream: 0, timeFormat: 0, ddnsVersion: 1, emailVersion: 1,
 *   pushVersion: 1, pushType: 1, audioAlarm: 1, apMode: 0, cloudVersion: 0,
 *   replayVersion: 1, mobComVersion: 0, ExportImport: 1, languageVer: 0,
 *   videoStandard: 0, syncTime: 1, netPort: 1, nasVersion: 0, needReboot: 0,
 *   reboot: 1, audioCfg: 1, networkDiagnosis: 0, loginLocked: 1,
 *   wifiVersion: 0, previewVersion: 0, netSecurity: 0, IOTLink: 0,
 *   IOTLinkActionMax: 0, autoTest: 0, smartHome: { item: [] },
 *   item: [{
 *     chnID: 0, ptzType: 4, rfCfg: 0, noAudio: 0, autoFocus: 1,
 *     videoClip: 0, battery: 0, ispCfg: 1, osdCfg: 1, batAnalysis: 0,
 *     dynamicReso: 0, audioVersion: 1, ledCtrl: 1, ptzControl: 1,
 *     newIspCfg: 1, ptzPreset: 1, ptzPatrol: 1, ptzTattern: 0, autoPt: 1,
 *     h264Profile: 7, motion: 1, aitype: 3, aiAnimalType: 0, timelapse: 0,
 *     snap: 1, encCtrl: 0, zfBacklash: 0, IOTLinkAbility: 0, thumbnail: 1,
 *   }],
 * });
 *
 * assertEquals(support.decode(parse(xml).root).item[0].ptzPreset, 1);
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  oneOf,
  optional,
  repeated,
  text,
  uint,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One smart home assistant, in `<smartHome><item>`. */
export type SupportSmartHomeItem = {
  /** The assistant; this firmware writes `googleHome` or `amazonAlexa`. */
  name: string;
  /** The assistant integration version. */
  ver: number;
};

/** The smart home assistants, in `<smartHome>`. */
export type SupportSmartHome = {
  /** 1 when present; written only when bit 3 of `cloudVersion` is set. */
  version?: number;
  /** One entry per supported assistant, as repeated `<item>`. */
  item: SupportSmartHomeItem[];
};

/** One channel's feature flags, in a top-level `<item>`. */
export type SupportChannel = {
  /** Zero-based channel. */
  chnID: number;
  /** PTZ type of the channel. */
  ptzType: number;
  /** PIR configuration support. */
  rfCfg: number;
  /** 1 when the channel has no audio. */
  noAudio: number;
  /** Autofocus support. */
  autoFocus: number;
  /** Video clip support. */
  videoClip: number;
  /** Battery support. */
  battery: number;
  /** Image (ISP) settings version. */
  ispCfg: number;
  /** OSD settings version. */
  osdCfg: number;
  /** Battery analysis support. */
  batAnalysis: number;
  /** Dynamic resolution support. */
  dynamicReso: number;
  /** Audio feature version. */
  audioVersion: number;
  /** LED control support. */
  ledCtrl: number;
  /** PTZ control support. */
  ptzControl: number;
  /** Newer image settings version. */
  newIspCfg: number;
  /** PTZ preset support. */
  ptzPreset: number;
  /** PTZ patrol support. */
  ptzPatrol: number;
  /** PTZ pattern support; the firmware spells it `ptzTattern`. */
  ptzTattern: number;
  /** Auto pan support. */
  autoPt: number;
  /** H.264 profile capability. */
  h264Profile: number;
  /** Motion detection version. */
  motion: number;
  /** AI detection types offered. */
  aitype: number;
  /** AI animal detection types offered; RLC-823A only. */
  aiAnimalType?: number;
  /** Event type feature version; Video Doorbell PoE only. */
  eventTypeVersion?: number;
  /** Time-lapse support. */
  timelapse: number;
  /** Snapshot support. */
  snap: number;
  /** Encoder control support. */
  encCtrl: number;
  /** Zoom/focus backlash setting support. */
  zfBacklash: number;
  /** IoT link ability. */
  IOTLinkAbility: number;
  /** The device-wide `audioTalk`; only on a multi-channel device with it set. */
  ipcAudioTalk?: number;
  /** Always 0; present only when the model has no privacy mask support. */
  shelter?: number;
  /** Thumbnail support; RLC-823A only. */
  thumbnail?: number;
  /** Doorbell feature version; Video Doorbell PoE only. */
  doorbellVersion?: number;
  /** AI model update support; Video Doorbell PoE only. */
  aiUpdateAbility?: number;
  /** Meaning not recovered beyond the name; Video Doorbell PoE only. */
  remoteAbility?: number;
};

/** The device features in `<Support>`. */
export type Support = {
  /** Number of alarm inputs. */
  IOInputPortNum: number;
  /** Number of alarm outputs. */
  IOOutputPortNum: number;
  /** Number of disks. */
  diskNum: number;
  /** Number of channels. */
  channelNum: number;
  /** Number of audio channels. */
  audioNum: number;
  /** PTZ capability; the firmware writes `none` for an unknown mode. */
  ptzMode: "none" | "af" | "ptz" | "pt" | "p";
  /** PTZ configuration support. */
  ptzCfg: number;
  /** RS-485 support. */
  B485: number;
  /** Automatic update support. */
  autoUpdate: number;
  /** Push alarm support. */
  pushAlarm: number;
  /** FTP support. */
  ftp: number;
  /** FTP test support. */
  ftpTest: number;
  /** Email support. */
  email: number;
  /** Wi-Fi support. */
  wifi: number;
  /** Recording support. */
  record: number;
  /** Wi-Fi test support. */
  wifiTest: number;
  /** RTSP support. */
  rtsp: number;
  /** ONVIF support. */
  onvif: number;
  /** Two-way audio support. */
  audioTalk: number;
  /** PIR feature version. */
  rfVersion: number;
  /** RTMP support. */
  rtmp: number;
  /** 1 when there is no extern stream. */
  noExternStream: number;
  /** Time format setting. */
  timeFormat: number;
  /** DDNS feature version. */
  ddnsVersion: number;
  /** Email feature version. */
  emailVersion: number;
  /** Push feature version. */
  pushVersion: number;
  /** Push type. */
  pushType: number;
  /** Audio alarm support. */
  audioAlarm: number;
  /** Access point mode support. */
  apMode: number;
  /** Cloud feature version, a bit set. */
  cloudVersion: number;
  /** Playback feature version. */
  replayVersion: number;
  /** Mobile communication feature version. */
  mobComVersion: number;
  /** Configuration export and import support. */
  ExportImport: number;
  /** Language feature version. */
  languageVer: number;
  /** Video standard setting. */
  videoStandard: number;
  /** Time sync support. */
  syncTime: number;
  /** Network port setting support. */
  netPort: number;
  /** NAS feature version. */
  nasVersion: number;
  /** 1 when settings changes need a reboot. */
  needReboot: number;
  /** Remote reboot support. */
  reboot: number;
  /** Audio settings support. */
  audioCfg: number;
  /** Network diagnosis support. */
  networkDiagnosis: number;
  /** Login lockout support; RLC-823A only. */
  loginLocked?: number;
  /** Height difference adjustment support; Video Doorbell PoE only. */
  heightDiffAdjust?: number;
  /** Wi-Fi feature version. */
  wifiVersion: number;
  /** Preview feature version. */
  previewVersion: number;
  /** Network security feature support. */
  netSecurity: number;
  /** Meaning not recovered beyond the name; Video Doorbell PoE only. */
  user?: number;
  /** IoT link support. */
  IOTLink: number;
  /** Maximum IoT link actions. */
  IOTLinkActionMax: number;
  /** Automatic test support; RLC-823A only. */
  autoTest?: number;
  /** Recording settings support; written only on battery models. */
  recordCfg?: number;
  /** The smart home assistants. */
  smartHome: SupportSmartHome;
  /** One entry per channel, as repeated `<item>` elements. */
  item: SupportChannel[];
};

/**
 * Codec for `<Support>`.
 *
 * @example Read the smart home assistants
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { support } from "@hertzg/reolink-api/protocol/params";
 *
 * const smartHome = parse(
 *   "<p><smartHome><version>1</version><item><name>googleHome</name>" +
 *     "<ver>2</ver></item></smartHome></p>",
 * ).root;
 *
 * assertEquals(support.fields.smartHome.decode("smartHome", smartHome), {
 *   version: 1,
 *   item: [{ name: "googleHome", ver: 2 }],
 * });
 * ```
 */
export const support: XmlParam<"Support", Support> = xmlParam("Support", {
  IOInputPortNum: int(),
  IOOutputPortNum: int(),
  diskNum: int(),
  channelNum: int(),
  audioNum: int(),
  ptzMode: oneOf("none", "af", "ptz", "pt", "p"),
  ptzCfg: int(),
  B485: int(),
  autoUpdate: int(),
  pushAlarm: int(),
  ftp: int(),
  ftpTest: int(),
  email: int(),
  wifi: int(),
  record: int(),
  wifiTest: int(),
  rtsp: int(),
  onvif: int(),
  audioTalk: int(),
  rfVersion: int(),
  rtmp: int(),
  noExternStream: int(),
  timeFormat: int(),
  ddnsVersion: int(),
  emailVersion: int(),
  pushVersion: int(),
  pushType: int(),
  audioAlarm: int(),
  apMode: int(),
  cloudVersion: int(),
  replayVersion: int(),
  mobComVersion: int(),
  ExportImport: int(),
  languageVer: int(),
  videoStandard: int(),
  syncTime: int(),
  netPort: int(),
  nasVersion: int(),
  needReboot: int(),
  reboot: int(),
  audioCfg: int(),
  networkDiagnosis: int(),
  loginLocked: optional(int()),
  heightDiffAdjust: optional(int()),
  wifiVersion: int(),
  previewVersion: int(),
  netSecurity: int(),
  user: optional(int()),
  IOTLink: int(),
  IOTLinkActionMax: int(),
  autoTest: optional(int()),
  recordCfg: optional(int()),
  smartHome: obj({
    version: optional(int()),
    item: repeated(obj({ name: text(), ver: uint() })),
  }),
  item: repeated(obj({
    chnID: int(),
    ptzType: int(),
    rfCfg: int(),
    noAudio: int(),
    autoFocus: int(),
    videoClip: int(),
    battery: int(),
    ispCfg: int(),
    osdCfg: int(),
    batAnalysis: int(),
    dynamicReso: int(),
    audioVersion: int(),
    ledCtrl: int(),
    ptzControl: int(),
    newIspCfg: int(),
    ptzPreset: int(),
    ptzPatrol: int(),
    ptzTattern: int(),
    autoPt: int(),
    h264Profile: int(),
    motion: int(),
    aitype: int(),
    aiAnimalType: optional(int()),
    eventTypeVersion: optional(int()),
    timelapse: int(),
    snap: int(),
    encCtrl: int(),
    zfBacklash: int(),
    IOTLinkAbility: int(),
    ipcAudioTalk: optional(int()),
    shelter: optional(int()),
    thumbnail: optional(int()),
    doorbellVersion: optional(int()),
    aiUpdateAbility: optional(int()),
    remoteAbility: optional(int()),
  })),
});
