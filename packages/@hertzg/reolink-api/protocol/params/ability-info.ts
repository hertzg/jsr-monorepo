/**
 * `<AbilityInfo>`: what the logged-in user may read or change, module by
 * module. Sent in the reply to cmd 151.
 *
 * Firmware: `net_ability_s2x` always writes `userName`. Each module element
 * appears only when the device has the module and the user holds at least
 * one permission in it. Global modules (`system`, `network`, `PTZ`, `IO`,
 * `audio`, `security`, `disk`) hold one `<subModule>`; per-channel modules
 * (`streaming`, `record`, `image`, `video`, `replay`) hold one per channel
 * with a permission, up to 64, each with its `channelId`. `alarm` mixes
 * both: an optional global `<subModule>` first, then per-channel ones.
 *
 * `abilityValue` lists permissions as `name_ro` or `name_rw`, separated by
 * `", "`, such as `general_rw, norm_ro`.
 *
 * @example Read the cmd 151 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { abilityInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AbilityInfo version="1.1"><userName>admin</userName>' +
 *     "<system><subModule><abilityValue>general_rw, reboot_rw</abilityValue>" +
 *     "</subModule></system></AbilityInfo>",
 * ).root;
 *
 * assertEquals(
 *   abilityInfo.decode(root).system?.subModule.abilityValue,
 *   "general_rw, reboot_rw",
 * );
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A module that applies to the whole device. */
export type AbilityGlobalModule = {
  /** The permissions. */
  subModule: {
    /** Permissions as `name_ro` or `name_rw`, separated by `", "`. */
    abilityValue: string;
  };
};

/** A module with permissions per channel. */
export type AbilityChannelModule = {
  /** One entry per channel with a permission, as repeated `<subModule>`. */
  subModule: {
    /** Zero-based channel. */
    channelId: number;
    /** Permissions as `name_ro` or `name_rw`, separated by `", "`. */
    abilityValue: string;
  }[];
};

/** The alarm module: an optional device-wide entry, then per-channel ones. */
export type AbilityAlarmModule = {
  /**
   * The entries, as repeated `<subModule>`; the device-wide one comes first
   * and has no `channelId`.
   */
  subModule: {
    /** Zero-based channel; absent on the device-wide entry. */
    channelId?: number;
    /** Permissions as `name_ro` or `name_rw`, separated by `", "`. */
    abilityValue: string;
  }[];
};

/** The user's permissions in `<AbilityInfo>`. */
export type AbilityInfo = {
  /** The user these permissions belong to. */
  userName: string;
  /** System: general, norm, version, uid, autoReboot, restore, reboot and so on. */
  system?: AbilityGlobalModule;
  /** Streaming per channel: preview, compress, snap, rtsp, streamTable. */
  streaming?: AbilityChannelModule;
  /** Recording per channel: download, fileFind, manualRecord, recordCfg and so on. */
  record?: AbilityChannelModule;
  /** Network: port, dns, email, ftp, wifi, ntp, push, ptop and so on. */
  network?: AbilityGlobalModule;
  /** PTZ: control, preset, cruise, track, decoder, ptzInfo. */
  PTZ?: AbilityGlobalModule;
  /** Alarm I/O: manualAlarm, ioAlarmIn, ioAlarmOut. */
  IO?: AbilityGlobalModule;
  /** Alarms: hddFull, hddError and so on device-wide; motion, videoLost, hide, smart per channel. */
  alarm?: AbilityAlarmModule;
  /** Image per channel: ispBasic, ispAdvance, ledState. */
  image?: AbilityChannelModule;
  /** Video per channel: osdName, osdTime, shelter. */
  video?: AbilityChannelModule;
  /** Audio: talk. */
  audio?: AbilityGlobalModule;
  /** Security: user, userOnline, bootPwd. */
  security?: AbilityGlobalModule;
  /** Playback per channel: replay, seek. */
  replay?: AbilityChannelModule;
  /** Disk: format, hddCfg, hddInit. */
  disk?: AbilityGlobalModule;
};

/**
 * Codec for `<AbilityInfo>`.
 *
 * @example Read per-channel streaming permissions
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { abilityInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AbilityInfo version="1.1"><userName>guest</userName><streaming>' +
 *     "<subModule><channelId>0</channelId><abilityValue>preview_ro</abilityValue>" +
 *     "</subModule></streaming></AbilityInfo>",
 * ).root;
 *
 * assertEquals(abilityInfo.decode(root).streaming?.subModule, [
 *   { channelId: 0, abilityValue: "preview_ro" },
 * ]);
 * ```
 */
export const abilityInfo: XmlParam<"AbilityInfo", AbilityInfo> = xmlParam(
  "AbilityInfo",
  {
    userName: text(),
    system: optional(obj({ subModule: obj({ abilityValue: text() }) })),
    streaming: optional(obj({
      subModule: repeated(obj({ channelId: int(), abilityValue: text() })),
    })),
    record: optional(obj({
      subModule: repeated(obj({ channelId: int(), abilityValue: text() })),
    })),
    network: optional(obj({ subModule: obj({ abilityValue: text() }) })),
    PTZ: optional(obj({ subModule: obj({ abilityValue: text() }) })),
    IO: optional(obj({ subModule: obj({ abilityValue: text() }) })),
    alarm: optional(obj({
      subModule: repeated(obj({
        channelId: optional(int()),
        abilityValue: text(),
      })),
    })),
    image: optional(obj({
      subModule: repeated(obj({ channelId: int(), abilityValue: text() })),
    })),
    video: optional(obj({
      subModule: repeated(obj({ channelId: int(), abilityValue: text() })),
    })),
    audio: optional(obj({ subModule: obj({ abilityValue: text() }) })),
    security: optional(obj({ subModule: obj({ abilityValue: text() }) })),
    replay: optional(obj({
      subModule: repeated(obj({ channelId: int(), abilityValue: text() })),
    })),
    disk: optional(obj({ subModule: obj({ abilityValue: text() }) })),
  },
);
