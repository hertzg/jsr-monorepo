/**
 * `<Ftp>`: the FTP upload server and what gets uploaded. Read with cmd 68
 * (`GET_FTPCFG_V20`), written with cmd 69 (`SET_FTPCFG_V20`) and tried with
 * cmd 194 (`FTP_TEST_V20`).
 *
 * Firmware: `nets_ftp_cfg_s2x` writes every field except `bnameEncrypt`
 * always, and `pwdMaxLen` as the constant 127. `nets_param_ftp_cfg_x2s`
 * reads whichever field is present, including `bnameEncrypt`, which the
 * reply never carries, and never reads `pwdMaxLen`. It rejects a `port`
 * outside 1 to 65535. The anonymous login flag is spelled `nonymous` in the
 * firmware.
 *
 * @example Read a cmd 68 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ftp } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Ftp version="1.1"><server>ftp.example.com</server><port>21</port>' +
 *     "<nonymous>0</nonymous><remoteDir>cam</remoteDir><userName>uploader</userName>" +
 *     "<password></password><pwdMaxLen>127</pwdMaxLen></Ftp>",
 * ).root;
 *
 * assertEquals(ftp.decode(root).pwdMaxLen, 127);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The FTP upload settings in `<Ftp>`. */
export type Ftp = {
  /** Server host name or address, up to 255 characters. */
  server?: string;
  /** Server port, 1 to 65535. */
  port?: number;
  /** 1 to log in anonymously. */
  nonymous?: number;
  /** Upload directory on the server, up to 255 characters. */
  remoteDir?: string;
  /** Login user name. */
  userName?: string;
  /** Login password. */
  password?: string;
  /** Longest password the camera accepts; the firmware writes 127. Reply only. */
  pwdMaxLen?: number;
  /** Video file length. */
  fileLen?: number;
  /** 1 when the camera supports cmd 194, the FTP test. */
  supportTest?: number;
  /** Which stream to record for upload. */
  streamType?: number;
  /** FTP protocol variant index. */
  ftpVersion?: number;
  /** Upload interval. */
  intervals?: number;
  /** Transfer mode index. */
  mode?: number;
  /** Name encryption flag; request only. */
  bnameEncrypt?: number;
  /** 1 to create directories automatically. */
  autoDir?: number;
  /** Picture upload policy. */
  picPolicy?: number;
  /** Picture file name pattern, up to 255 characters. */
  picName?: string;
  /** Picture type index. */
  picType?: number;
  /** Picture height. */
  picHeight?: number;
  /** Picture width. */
  picWidth?: number;
  /** Interval between picture uploads. */
  picIntervals?: number;
  /** Video upload policy. */
  videoPolicy?: number;
  /** Video file name pattern, up to 255 characters. */
  videoName?: string;
  /** 1 to allow only FTPS. */
  onlyFtps?: number;
};

/**
 * Codec for `<Ftp>`.
 *
 * @example Point uploads at a new server
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ftp } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   ftp.encode({ server: "10.0.0.5", port: 2121 }),
 *   '<Ftp version="1.1"><server>10.0.0.5</server><port>2121</port></Ftp>',
 * );
 * ```
 */
export const ftp: XmlParam<"Ftp", Ftp> = xmlParam("Ftp", {
  server: optional(text()),
  port: optional(int()),
  nonymous: optional(int()),
  remoteDir: optional(text()),
  userName: optional(text()),
  password: optional(text()),
  pwdMaxLen: optional(int()),
  fileLen: optional(int()),
  supportTest: optional(int()),
  streamType: optional(int()),
  ftpVersion: optional(int()),
  intervals: optional(int()),
  mode: optional(int()),
  bnameEncrypt: optional(int()),
  autoDir: optional(int()),
  picPolicy: optional(int()),
  picName: optional(text()),
  picType: optional(int()),
  picHeight: optional(int()),
  picWidth: optional(int()),
  picIntervals: optional(int()),
  videoPolicy: optional(int()),
  videoName: optional(text()),
  onlyFtps: optional(int()),
});
