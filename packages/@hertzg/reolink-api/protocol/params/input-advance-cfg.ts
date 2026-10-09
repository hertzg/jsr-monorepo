/**
 * `<InputAdvanceCfg>`: the full image (ISP) settings of a channel, read with
 * cmd 26 and 132 and written with cmd 25.
 *
 * Firmware: `nets_isp_advance_cfg_s2x` writes `channelId` and
 * `digitalChannel`, and stops there when `digitalChannel` is 0. Otherwise it
 * writes every block below; `bdDayColor`, `bdNight` and `bdNightColor` only
 * when their mode is set, `constantFrameRate` with its ability and `hdrSwitch`
 * with its ability only when the camera supports them.
 * `nets_isp_advance_common_x2s` reads all of it back and requires none of
 * the top-level fields, so they are all optional. The few nested fields it
 * does require are noted on the field.
 *
 * ```
 * InputAdvanceCfg
 * ├─ channelId, digitalChannel
 * ├─ PowerLineFrequency  mode enable
 * ├─ Exposure            mode Gainctl Shutterctl shutterLevel gainLevel
 * ├─ Scene               mode modeList Redgain Bluegain
 * ├─ DayNight            mode IrcutMode Threshold
 * ├─ BLC                 enable mode backlight dynamicrange
 * ├─ bdDayColor / bdNight / bdNightColor   mode bright dark
 * ├─ mirror, flip
 * ├─ Iris                enable state focusAutoiris
 * ├─ nr3d                value enable
 * └─ firstFrameStrategy ... hdrSwitch
 * ```
 *
 * @example Read the settings of a digital channel
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { inputAdvanceCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<InputAdvanceCfg version="1.1"><channelId>0</channelId>' +
 *     "<digitalChannel>1</digitalChannel><mirror>0</mirror><flip>1</flip>" +
 *     "</InputAdvanceCfg>",
 * ).root;
 *
 * assertEquals(inputAdvanceCfg.decode(root).flip, 1);
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
  type XmlField,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A bounded value as `min`, `max` and current value `cur`. */
export type IspRange = {
  /** Lowest allowed value. */
  min?: number;
  /** Highest allowed value. */
  max?: number;
  /** Current value; the parser rejects it outside `min` to `max`. */
  cur?: number;
};

/** A default and a current range, used by the exposure gain and shutter. */
export type IspAreaCtrl = {
  /** Default lower bound. */
  defMin?: number;
  /** Default upper bound. */
  defMax?: number;
  /** Current lower bound. */
  curMin?: number;
  /** Current upper bound. */
  curMax?: number;
};

/** Brightness and darkness limits for one day/night state. */
export type IspBrightDark = {
  /** Required: the parser rejects the block without it. */
  mode: "auto" | "manual";
  /** Brightness limit. */
  bright?: IspRange;
  /** Darkness limit. */
  dark?: IspRange;
};

/** The image settings in `<InputAdvanceCfg>`. */
export type InputAdvanceCfg = {
  /** Zero-based channel, 0 to 63. */
  channelId?: number;
  /** 1 when the channel has the settings below; 0 or 1. */
  digitalChannel?: number;
  /** Anti-flicker; off is written as `50hz` with `enable` 0. */
  PowerLineFrequency?: {
    /** Mains frequency to match, or `outdoor` for none. */
    mode?: "outdoor" | "50hz" | "60hz";
    /** 0 when anti-flicker is off. */
    enable?: number;
  };
  /** Exposure. */
  Exposure?: {
    /** Exposure mode; `gainFist` is the firmware's own spelling. */
    mode?: "auto" | "shutterFirst" | "gainFist" | "manual";
    /** Gain range. */
    Gainctl?: IspAreaCtrl;
    /** Shutter range. */
    Shutterctl?: IspAreaCtrl;
    /** Shutter time in seconds. */
    shutterLevel?:
      | "1/3"
      | "1/4"
      | "1/5"
      | "1/6"
      | "1/8"
      | "1/12"
      | "1/15"
      | "1/25"
      | "1/30"
      | "1/50"
      | "1/60"
      | "1/100"
      | "1/120"
      | "1/250"
      | "1/500"
      | "1/1000"
      | "1/2000"
      | "1/4000"
      | "1/10000";
    /** Gain level, 0 to 100. */
    gainLevel?: number;
  };
  /** White balance scene. */
  Scene?: {
    /** Scene the white balance is tuned for. */
    mode?: "auto" | "indoor" | "outdoor" | "manual";
    /** Selectable modes as text; the camera writes `auto, manual`. */
    modeList?: string;
    /** Red gain in manual mode. */
    Redgain?: IspRange;
    /** Blue gain in manual mode. */
    Bluegain?: IspRange;
  };
  /** Day/night switching. */
  DayNight?: {
    /** Switch automatically, or hold colour or black and white. */
    mode?: "auto" | "color" | "blackAndWhite";
    /** How the IR-cut filter switches. */
    IrcutMode?: "auto" | "ir";
    /** Light level that triggers the switch. */
    Threshold?: "low" | "medium" | "high";
  };
  /** Backlight compensation; off is written as `backLight` with `enable` 0. */
  BLC?: {
    /** 0 when compensation is off. */
    enable?: number;
    /** Compensation method. */
    mode?: "backLight" | "dynamicRange";
    /** Backlight level. */
    backlight?: IspRange;
    /** Dynamic range level. */
    dynamicrange?: IspRange;
  };
  /** Brightness limits in colour daytime. */
  bdDayColor?: IspBrightDark;
  /** Brightness limits in black-and-white night. */
  bdNight?: IspBrightDark;
  /** Brightness limits in colour night. */
  bdNightColor?: IspBrightDark;
  /** 1 when the image is mirrored. */
  mirror?: number;
  /** 1 when the image is flipped. */
  flip?: number;
  /** Auto-iris. */
  Iris?: {
    /** 1 when auto-iris is on. */
    enable?: number;
    /**
     * Calibration state: `success`, `failed` or `calibrating`; the camera
     * writes an empty string for a state it has no name for.
     */
    state?: string;
    /** Auto-iris focus setting. */
    focusAutoiris?: number;
  };
  /** 3D noise reduction. */
  nr3d?: {
    /** Strength. */
    value?: "high" | "medium" | "low" | "off";
    /** 1 when noise reduction is on. */
    enable?: number;
  };
  /** First-frame strategy; 0 or 1. */
  firstFrameStrategy?: number;
  /** Constant frame rate setting; written only when supported. */
  constantFrameRate?: number;
  /** Whether constant frame rate is supported; written with it. */
  constantFrameRateAbility?: number;
  /** Sensor binning mode. */
  binning_mode?: number;
  /** Supported encoder types. */
  encTypeAbility?: number;
  /** Encoder type. */
  encType?: number;
  /** Whether HDR is supported; written only with `hdrSwitch`. */
  hdrAbility?: number;
  /** HDR switch; not negative. */
  hdrSwitch?: number;
};

function range(): XmlField<IspRange> {
  return obj({
    min: optional(int()),
    max: optional(int()),
    cur: optional(int()),
  });
}

function areaCtrl(): XmlField<IspAreaCtrl> {
  return obj({
    defMin: optional(int()),
    defMax: optional(int()),
    curMin: optional(int()),
    curMax: optional(int()),
  });
}

function brightDark(): XmlField<IspBrightDark> {
  return obj({
    mode: oneOf("auto", "manual"),
    bright: optional(range()),
    dark: optional(range()),
  });
}

/**
 * Codec for `<InputAdvanceCfg>`.
 *
 * @example Build a request that switches to black and white
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { inputAdvanceCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = inputAdvanceCfg.encode({
 *   channelId: 0,
 *   DayNight: { mode: "blackAndWhite" },
 * });
 *
 * assertStringIncludes(xml, "<DayNight><mode>blackAndWhite</mode></DayNight>");
 * ```
 */
export const inputAdvanceCfg: XmlParam<"InputAdvanceCfg", InputAdvanceCfg> =
  xmlParam("InputAdvanceCfg", {
    channelId: optional(int()),
    digitalChannel: optional(int()),
    PowerLineFrequency: optional(obj({
      mode: optional(oneOf("outdoor", "50hz", "60hz")),
      enable: optional(int()),
    })),
    Exposure: optional(obj({
      mode: optional(oneOf("auto", "shutterFirst", "gainFist", "manual")),
      Gainctl: optional(areaCtrl()),
      Shutterctl: optional(areaCtrl()),
      shutterLevel: optional(oneOf(
        "1/3",
        "1/4",
        "1/5",
        "1/6",
        "1/8",
        "1/12",
        "1/15",
        "1/25",
        "1/30",
        "1/50",
        "1/60",
        "1/100",
        "1/120",
        "1/250",
        "1/500",
        "1/1000",
        "1/2000",
        "1/4000",
        "1/10000",
      )),
      gainLevel: optional(int()),
    })),
    Scene: optional(obj({
      mode: optional(oneOf("auto", "indoor", "outdoor", "manual")),
      modeList: optional(text()),
      Redgain: optional(range()),
      Bluegain: optional(range()),
    })),
    DayNight: optional(obj({
      mode: optional(oneOf("auto", "color", "blackAndWhite")),
      IrcutMode: optional(oneOf("auto", "ir")),
      Threshold: optional(oneOf("low", "medium", "high")),
    })),
    BLC: optional(obj({
      enable: optional(int()),
      mode: optional(oneOf("backLight", "dynamicRange")),
      backlight: optional(range()),
      dynamicrange: optional(range()),
    })),
    bdDayColor: optional(brightDark()),
    bdNight: optional(brightDark()),
    bdNightColor: optional(brightDark()),
    mirror: optional(int()),
    flip: optional(int()),
    Iris: optional(obj({
      enable: optional(int()),
      state: optional(text()),
      focusAutoiris: optional(int()),
    })),
    nr3d: optional(obj({
      value: optional(oneOf("high", "medium", "low", "off")),
      enable: optional(int()),
    })),
    firstFrameStrategy: optional(int()),
    constantFrameRate: optional(int()),
    constantFrameRateAbility: optional(int()),
    binning_mode: optional(int()),
    encTypeAbility: optional(int()),
    encType: optional(int()),
    hdrAbility: optional(int()),
    hdrSwitch: optional(int()),
  });
