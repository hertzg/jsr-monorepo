/**
 * Every Baichuan command registered by the firmware builds this package was
 * derived from, and the messages they push unasked, as data for
 * `Client.call` and `Client.pushes`.
 *
 * ```
 * COMMANDS  257 requests  RLC-823A camera: 225, Video Doorbell PoE: 246
 * PUSHES      9 pushes
 * ```
 *
 * Keys and names come from the firmware dispatch tables, typos included
 * (`SETVEDIOPARAM_V20`). Each entry lists the builds that register it in
 * `firmware`. Registration does not mean a given device answers: models and
 * firmware versions answer unsupported commands with an error status.
 *
 * A command's `params` are the elements its dispatch table lists plus any
 * element its reply was found to carry instead, such as cmd 253 answering
 * `<BatteryInfo>` for a `<ChargeBatteryInfo>` request.
 *
 * @example Read the network ports
 * ```ts ignore
 * import { createClient } from "@hertzg/reolink-api";
 * import { COMMANDS } from "@hertzg/reolink-api/protocol/commands";
 *
 * const conn = await Deno.connect({ hostname: "192.168.1.10", port: 9000 });
 * const client = createClient({ readable: conn.readable, writable: conn.writable });
 * await client.login({ username: "admin", password: "secret" });
 *
 * const { body } = await client.call(COMMANDS.GET_NETPORT_CFG_V20);
 * console.log(body.RtspPort?.rtspPort);
 * ```
 *
 * @example Look up a command
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { COMMANDS } from "@hertzg/reolink-api/protocol/commands";
 *
 * assertEquals(COMMANDS.GET_NETPORT_CFG_V20.id, 37);
 * assertEquals(
 *   COMMANDS.GET_NETPORT_CFG_V20.params.map((param) => param.name),
 *   ["ServerPort", "HttpPort", "RtspPort", "OnvifPort", "HttpsPort", "RtmpPort"],
 * );
 * ```
 *
 * @module
 */

import { type Command, command } from "./command.ts";
import {
  abilityInfo,
  abilitySuppport,
  accessInfo,
  accessUserList,
  afAlgorithm,
  aiCfg,
  aiDetectCfg,
  aiTrackData,
  aiyuvCfg,
  alarmArea,
  alarmEventList,
  alarmVideoInfo,
  answerEvent,
  audioCfg,
  audioEncodeAbility,
  audioFileInfo,
  audioFileInfoList,
  audioPlayInfo,
  audioTask,
  authInfo,
  autoDns,
  autoFocus,
  autoReboot,
  autoReply,
  autoUpdate,
  batteryInfo,
  batteryList,
  batteryRemainList,
  bindCloud,
  bindNasInfoList,
  bindUnbindNas,
  blc,
  certificateInfo,
  chargeBatteryInfo,
  cloudBindInfo,
  cloudLoginKey,
  cloudTask,
  cloudTestResult,
  cloudUploadCfg,
  compression,
  configFileInfo,
  coverPreview,
  crop,
  cropSnap,
  cropSnapReply,
  dayNightMode,
  dayNightThreshold,
  dayRecords,
  ddns,
  deleteRecordFile,
  deviceInfo,
  dhcp,
  dingdongCfg,
  dingdongCtrl,
  dingdongDeviceOpt,
  dingdongList,
  dingdongSilentMode,
  dns,
  dst,
  email,
  emailTask,
  exposureCfg,
  fileInfoList,
  findAlarmVideo,
  flip,
  floodlightManual,
  floodlightStatusList,
  floodlightTask,
  freqCorrectResult,
  ftp,
  ftpTask,
  ftpTestResult,
  gain,
  gopCfg,
  hddInfoList,
  hddInitList,
  heartBeat,
  httpPort,
  httpsPort,
  imageFileInfo,
  inputAdvanceCfg,
  iotAction,
  iotActionList,
  iotBindInfoList,
  iotBindUnBind,
  ip,
  ipcVersionList,
  ircutMode,
  ledState,
  linkType,
  loginErrInfo,
  loginNet,
  loginUser,
  md,
  mirror,
  muteAudio,
  nasUploadCfg,
  net3g4gInfo,
  net3g4gModuleInfo,
  networkDiagnosisData,
  norm,
  ntp,
  onlineNewFirmwareInfo,
  onlineUpdate,
  onlineUserList,
  onvifPort,
  osdChannelName,
  osdDatetime,
  paramDataV20,
  performanceInfo,
  powerLineFrequency,
  preview,
  ptop,
  ptz3DLocation,
  ptzAutoTest,
  ptzControl,
  ptzCruise,
  ptzCurPos,
  ptzGuard,
  ptzPreset,
  ptzZoomFocus,
  pushCfg,
  pushClientId,
  pushClientState,
  pushCreateListener,
  pushInfo,
  pushRspInfo,
  pushTask,
  pushTestResult,
  record,
  recordCfg,
  replayByTimeV2,
  replaySeek,
  replaySeekV2,
  requestIframe,
  restore,
  rfAlarmCfg,
  rtmpPort,
  rtspPort,
  scanAp,
  scene,
  serial,
  serverPort,
  shelter,
  shutter,
  sleepState,
  sleepStatus,
  smtPlayUrl,
  smtPlayUrlReply,
  snap,
  startZoomFocus,
  streamInfoList,
  support,
  syncSsid,
  systemGeneral,
  talkAbility,
  talkConfig,
  timeCfg,
  timelapseCfg,
  timelapseCover,
  timelapseDateTbl,
  timelapseDownload,
  timelapseFileDel,
  timelapseFileSearch,
  timelapseTaskDel,
  timelapseTasks,
  trackLimit,
  trackSchedule,
  uid,
  upgradeState,
  upnp,
  userList,
  versionInfo,
  videoInput,
  wifi,
  wifiSignal,
  zoomFocusInfo,
} from "./params/mod.ts";

/** The firmware request commands, keyed by name. */
export type Commands = {
  /** cmd 0, `HEART_BEAT_V20`. Parameters: `HeartBeat`. Firmware: RLC-823A, Video Doorbell PoE. */
  HEART_BEAT_V20: Command<readonly [typeof heartBeat]>;
  /** cmd 1, `LOGIN`. Parameters: `LoginUser`, `LoginNet`, `IpcVersionList`, `DeviceInfo`, `StreamInfoList`, `LoginErrInfo`, `accessInfo`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `DeviceInfo`, `StreamInfoList`, `LoginErrInfo`, `accessInfo`, which the dispatch table does not list. */
  LOGIN: Command<
    readonly [
      typeof loginUser,
      typeof loginNet,
      typeof ipcVersionList,
      typeof deviceInfo,
      typeof streamInfoList,
      typeof loginErrInfo,
      typeof accessInfo,
    ]
  >;
  /** cmd 2, `LOGOUT`. Parameters: `LoginUser`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  LOGOUT: Command<readonly [typeof loginUser]>;
  /** cmd 3, `START_PREVIEW`. Parameters: `Preview`. Firmware: RLC-823A, Video Doorbell PoE. */
  START_PREVIEW: Command<readonly [typeof preview]>;
  /** cmd 4, `STOP_PREVIEW`. Parameters: `Preview`. Firmware: RLC-823A, Video Doorbell PoE. */
  STOP_PREVIEW: Command<readonly [typeof preview]>;
  /** cmd 5, `START_REPLAY`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  START_REPLAY: Command<readonly [typeof fileInfoList]>;
  /** cmd 7, `STOP_REPLAY`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  STOP_REPLAY: Command<readonly [typeof fileInfoList]>;
  /** cmd 8, `DOWNLOAD_V20`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  DOWNLOAD_V20: Command<readonly [typeof fileInfoList]>;
  /** cmd 9, `DOWNLOAD_STOP_V20`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  DOWNLOAD_STOP_V20: Command<readonly [typeof fileInfoList]>;
  /** cmd 10, `GET_TALK_ABILITY`. Parameters: `TalkAbility`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TALK_ABILITY: Command<readonly [typeof talkAbility]>;
  /** cmd 11, `TALK_CLOSE_V20`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. */
  TALK_CLOSE_V20: Command<readonly []>;
  /** cmd 13, `FILE_INFO`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  FILE_INFO: Command<readonly [typeof fileInfoList]>;
  /** cmd 14, `SEARCH_OPEN`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  SEARCH_OPEN: Command<readonly [typeof fileInfoList]>;
  /** cmd 15, `SEARCH_FILE`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  SEARCH_FILE: Command<readonly [typeof fileInfoList]>;
  /** cmd 16, `SEARCH_CLOSE`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  SEARCH_CLOSE: Command<readonly [typeof fileInfoList]>;
  /** cmd 18, `PTZ_CONTROL_V20`. Parameters: `PtzControl`. Firmware: RLC-823A, Video Doorbell PoE. */
  PTZ_CONTROL_V20: Command<readonly [typeof ptzControl]>;
  /** cmd 19, `PTZ_PRESET_V20`. Parameters: `PtzPreset`. Firmware: RLC-823A, Video Doorbell PoE. */
  PTZ_PRESET_V20: Command<readonly [typeof ptzPreset]>;
  /** cmd 20, `PTZ_CRUISE_V20`. Parameters: `PtzCruise`. Firmware: RLC-823A, Video Doorbell PoE. */
  PTZ_CRUISE_V20: Command<readonly [typeof ptzCruise]>;
  /** cmd 23, `REBOOT_V20`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  REBOOT_V20: Command<readonly []>;
  /** cmd 25, `SETVEDIOPARAM_V20`. Parameters: `VideoInput`, `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SETVEDIOPARAM_V20: Command<
    readonly [typeof videoInput, typeof inputAdvanceCfg]
  >;
  /** cmd 26, `GETVEDIOPARAM_V20`. Parameters: `VideoInput`, `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GETVEDIOPARAM_V20: Command<
    readonly [typeof videoInput, typeof inputAdvanceCfg]
  >;
  /** cmd 31, `START_ALARM_REPORT`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. */
  START_ALARM_REPORT: Command<readonly []>;
  /** cmd 36, `SET_NETPORT_CFG_V20`. Parameters: `ServerPort`, `HttpPort`, `RtspPort`, `OnvifPort`, `HttpsPort`, `RtmpPort`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_NETPORT_CFG_V20: Command<
    readonly [
      typeof serverPort,
      typeof httpPort,
      typeof rtspPort,
      typeof onvifPort,
      typeof httpsPort,
      typeof rtmpPort,
    ]
  >;
  /** cmd 37, `GET_NETPORT_CFG_V20`. Parameters: `ServerPort`, `HttpPort`, `RtspPort`, `OnvifPort`, `HttpsPort`, `RtmpPort`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_NETPORT_CFG_V20: Command<
    readonly [
      typeof serverPort,
      typeof httpPort,
      typeof rtspPort,
      typeof onvifPort,
      typeof httpsPort,
      typeof rtmpPort,
    ]
  >;
  /** cmd 38, `GET_NTPCFG_V20`. Parameters: `Ntp`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_NTPCFG_V20: Command<readonly [typeof ntp]>;
  /** cmd 39, `SET_NTPCFG_V20`. Parameters: `Ntp`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_NTPCFG_V20: Command<readonly [typeof ntp]>;
  /** cmd 40, `GET_DDNSCFG_V20`. Parameters: `Ddns`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DDNSCFG_V20: Command<readonly [typeof ddns]>;
  /** cmd 41, `SET_DDNSCFG_V20`. Parameters: `Ddns`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_DDNSCFG_V20: Command<readonly [typeof ddns]>;
  /** cmd 42, `GET_EMAILCFG_V20`. Parameters: `Email`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_EMAILCFG_V20: Command<readonly [typeof email]>;
  /** cmd 43, `SET_EMAILCFG_V20`. Parameters: `Email`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_EMAILCFG_V20: Command<readonly [typeof email]>;
  /** cmd 44, `GET_OSD_CFG_V20`. Parameters: `OsdChannelName`, `OsdDatetime`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_OSD_CFG_V20: Command<
    readonly [typeof osdChannelName, typeof osdDatetime]
  >;
  /** cmd 45, `SET_OSD_CFG_V20`. Parameters: `OsdChannelName`, `OsdDatetime`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_OSD_CFG_V20: Command<
    readonly [typeof osdChannelName, typeof osdDatetime]
  >;
  /** cmd 46, `GET_MD_CFG_V20`. Parameters: `MD`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_MD_CFG_V20: Command<readonly [typeof md]>;
  /** cmd 47, `SET_MD_CFG_V20`. Parameters: `MD`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_MD_CFG_V20: Command<readonly [typeof md]>;
  /** cmd 52, `GET_SHELTER_CFG_V20`. Parameters: `Shelter`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_SHELTER_CFG_V20: Command<readonly [typeof shelter]>;
  /** cmd 53, `SET_SHELTER_CFG_V20`. Parameters: `Shelter`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_SHELTER_CFG_V20: Command<readonly [typeof shelter]>;
  /** cmd 54, `GET_RECORD_V20`. Parameters: `RecordCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_RECORD_V20: Command<readonly [typeof recordCfg]>;
  /** cmd 55, `SET_RECORD_V20`. Parameters: `RecordCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_RECORD_V20: Command<readonly [typeof recordCfg]>;
  /** cmd 56, `GET_COMPRESSIONCFG_V20`. Parameters: `Compression`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_COMPRESSIONCFG_V20: Command<readonly [typeof compression]>;
  /** cmd 57, `SET_COMPRESSIONCFG_V20`. Parameters: `Compression`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_COMPRESSIONCFG_V20: Command<readonly [typeof compression]>;
  /** cmd 58, `GET_USERCFG_V20`. Parameters: `AbilitySuppport`, `UserList`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_USERCFG_V20: Command<readonly [typeof abilitySuppport, typeof userList]>;
  /** cmd 59, `SET_USERCFG_V20`. Parameters: `UserList`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_USERCFG_V20: Command<readonly [typeof userList]>;
  /** cmd 64, `GET_PTZCRUISE_V20`. Parameters: `PtzCruise`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_PTZCRUISE_V20: Command<readonly [typeof ptzCruise]>;
  /** cmd 65, `EXPORT_CFG_V20`. Parameters: `ConfigFileInfo`. Firmware: RLC-823A, Video Doorbell PoE. Registered but unimplemented. */
  EXPORT_CFG_V20: Command<readonly [typeof configFileInfo]>;
  /** cmd 67, `UPDATE_DEVICE`. Parameters: `ConfigFileInfo`, `PARAM_DATA_V20`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  UPDATE_DEVICE: Command<readonly [typeof configFileInfo, typeof paramDataV20]>;
  /** cmd 68, `GET_FTPCFG_V20`. Parameters: `Ftp`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_FTPCFG_V20: Command<readonly [typeof ftp]>;
  /** cmd 69, `SET_FTPCFG_V20`. Parameters: `Ftp`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_FTPCFG_V20: Command<readonly [typeof ftp]>;
  /** cmd 70, `GET_FTPTASK_V20`. Parameters: `FtpTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_FTPTASK_V20: Command<readonly [typeof ftpTask]>;
  /** cmd 71, `SET_FTPTASK_V20`. Parameters: `FtpTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_FTPTASK_V20: Command<readonly [typeof ftpTask]>;
  /** cmd 76, `GET_LOCAL_LINK_V20`. Parameters: `Dhcp`, `AutoDns`, `Ip`, `Dns`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_LOCAL_LINK_V20: Command<
    readonly [typeof dhcp, typeof autoDns, typeof ip, typeof dns]
  >;
  /** cmd 77, `SET_LOCAL_LINK_V20`. Parameters: `Dhcp`, `AutoDns`, `Ip`, `Dns`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_LOCAL_LINK_V20: Command<
    readonly [typeof dhcp, typeof autoDns, typeof ip, typeof dns]
  >;
  /** cmd 80, `GET_VERSION_V20`. Parameters: `VersionInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_VERSION_V20: Command<readonly [typeof versionInfo]>;
  /** cmd 81, `GET_RECSCHEDULE_V20`. Parameters: `Record`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_RECSCHEDULE_V20: Command<readonly [typeof record]>;
  /** cmd 82, `SET_RECSCHEDULE_V20`. Parameters: `Record`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_RECSCHEDULE_V20: Command<readonly [typeof record]>;
  /** cmd 93, `GET_LINK_TYPE`. Parameters: `LinkType`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_LINK_TYPE: Command<readonly [typeof linkType]>;
  /** cmd 97, `GET_UPNPSTATE_V20`. Parameters: `Upnp`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_UPNPSTATE_V20: Command<readonly [typeof upnp]>;
  /** cmd 98, `SET_UPNPSTATE_V20`. Parameters: `Upnp`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_UPNPSTATE_V20: Command<readonly [typeof upnp]>;
  /** cmd 99, `SET_RESTORE_V20`. Parameters: `Restore`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  SET_RESTORE_V20: Command<readonly [typeof restore]>;
  /** cmd 100, `SET_AUTO_REBOOT_CFG_V20`. Parameters: `AutoReboot`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  SET_AUTO_REBOOT_CFG_V20: Command<readonly [typeof autoReboot]>;
  /** cmd 101, `GET_AUTO_REBOOT_CFG_V20`. Parameters: `AutoReboot`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  GET_AUTO_REBOOT_CFG_V20: Command<readonly [typeof autoReboot]>;
  /** cmd 102, `GET_HDD_CFG_V20`. Parameters: `HddInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_HDD_CFG_V20: Command<readonly [typeof hddInfoList]>;
  /** cmd 103, `INIT_HDD_V20`. Parameters: `HddInitList`. Firmware: RLC-823A, Video Doorbell PoE. */
  INIT_HDD_V20: Command<readonly [typeof hddInitList]>;
  /** cmd 104, `GET_SYSGENERAL_CFG_V20`. Parameters: `SystemGeneral`, `Norm`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_SYSGENERAL_CFG_V20: Command<readonly [typeof systemGeneral, typeof norm]>;
  /** cmd 105, `SET_SYSGENERAL_CFG_V20`. Parameters: `SystemGeneral`, `Norm`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_SYSGENERAL_CFG_V20: Command<readonly [typeof systemGeneral, typeof norm]>;
  /** cmd 106, `GET_DST_CFG_V20`. Parameters: `Dst`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DST_CFG_V20: Command<readonly [typeof dst]>;
  /** cmd 107, `SET_DST_CFG_V20`. Parameters: `Dst`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_DST_CFG_V20: Command<readonly [typeof dst]>;
  /** cmd 109, `SNAP_V20`. Parameters: `Snap`. Firmware: RLC-823A, Video Doorbell PoE. */
  SNAP_V20: Command<readonly [typeof snap]>;
  /** cmd 110, `GET_DEF_OSD_CFG_V20`. Parameters: `OsdChannelName`, `OsdDatetime`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DEF_OSD_CFG_V20: Command<
    readonly [typeof osdChannelName, typeof osdDatetime]
  >;
  /** cmd 111, `GET_DEF_INPUT_CFG_V20`. Parameters: `VideoInput`, `Shelter`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DEF_INPUT_CFG_V20: Command<readonly [typeof videoInput, typeof shelter]>;
  /** cmd 112, `GET_DEF_ENC_CFG_V20`. Parameters: `Compression`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DEF_ENC_CFG_V20: Command<readonly [typeof compression]>;
  /** cmd 113, `GET_DEF_MD_CFG_V20`. Parameters: `MD`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DEF_MD_CFG_V20: Command<readonly [typeof md]>;
  /** cmd 114, `GET_UID_CFG_V20`. Parameters: `Uid`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_UID_CFG_V20: Command<readonly [typeof uid]>;
  /** cmd 115, `GET_WIFI_SIGNAL_V20`. Parameters: `WifiSignal`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_WIFI_SIGNAL_V20: Command<readonly [typeof wifiSignal]>;
  /** cmd 116, `GET_WIFI_INFO_V20`. Parameters: `Wifi`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_WIFI_INFO_V20: Command<readonly [typeof wifi]>;
  /** cmd 117, `SET_WIFI_INFO_V20`. Parameters: `Wifi`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_WIFI_INFO_V20: Command<readonly [typeof wifi]>;
  /** cmd 120, `GET_USER_ONLINE_V20`. Parameters: `OnlineUserList`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_USER_ONLINE_V20: Command<readonly [typeof onlineUserList]>;
  /** cmd 121, `SET_USER_ONLINE_V20`. Parameters: `OnlineUserList`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_USER_ONLINE_V20: Command<readonly [typeof onlineUserList]>;
  /** cmd 122, `INFO_PERFORMANCE_V20`. Parameters: `PerformanceInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  INFO_PERFORMANCE_V20: Command<readonly [typeof performanceInfo]>;
  /** cmd 123, `REPLAY_SEEK`. Parameters: `ReplaySeek`. Firmware: RLC-823A, Video Doorbell PoE. */
  REPLAY_SEEK: Command<readonly [typeof replaySeek]>;
  /** cmd 124, `PUSH_ADD_V20`. Parameters: `PushInfo`, `PushRspInfo`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `PushRspInfo`, which the dispatch table does not list. */
  PUSH_ADD_V20: Command<readonly [typeof pushInfo, typeof pushRspInfo]>;
  /** cmd 125, `PUSH_DEL_V20`. Parameters: `PushInfo`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  PUSH_DEL_V20: Command<readonly [typeof pushInfo]>;
  /** cmd 132, `GET_DEF_ISP_CFG_V20`. Parameters: `InputAdvanceCfg`, `VideoInput`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DEF_ISP_CFG_V20: Command<
    readonly [typeof inputAdvanceCfg, typeof videoInput]
  >;
  /** cmd 141, `EMAIL_TEST_V20`. Parameters: `Email`. Firmware: RLC-823A, Video Doorbell PoE. */
  EMAIL_TEST_V20: Command<readonly [typeof email]>;
  /** cmd 142, `GET_DAY_RECORD`. Parameters: `DayRecords`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DAY_RECORD: Command<readonly [typeof dayRecords]>;
  /** cmd 143, `DOWNLOAD_CUT_V20`. Parameters: `FileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  DOWNLOAD_CUT_V20: Command<readonly [typeof fileInfoList]>;
  /** cmd 144, `DOWNLOAD_CUT_STOP_V20`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. */
  DOWNLOAD_CUT_STOP_V20: Command<readonly []>;
  /** cmd 146, `GET_ENC_CAPABILITY_V20`. Parameters: `StreamInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_ENC_CAPABILITY_V20: Command<readonly [typeof streamInfoList]>;
  /** cmd 151, `GET_ABILITY`. Parameters: `AbilityInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_ABILITY: Command<readonly [typeof abilityInfo]>;
  /** cmd 154, `CGI_GET_POWER_LINE_FREQUENCY`. Parameters: `InputAdvanceCfg`, `PowerLineFrequency`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `PowerLineFrequency`, which the dispatch table does not list. */
  CGI_GET_POWER_LINE_FREQUENCY: Command<
    readonly [typeof inputAdvanceCfg, typeof powerLineFrequency]
  >;
  /** cmd 155, `CGI_SET_POWER_LINE_FREQUENCY`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_POWER_LINE_FREQUENCY: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 156, `CGI_GET_EXPOSURE`. Parameters: `InputAdvanceCfg`, `ExposureCfg`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `ExposureCfg`, which the dispatch table does not list. */
  CGI_GET_EXPOSURE: Command<
    readonly [typeof inputAdvanceCfg, typeof exposureCfg]
  >;
  /** cmd 157, `CGI_SET_EXPOSURE`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_EXPOSURE: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 158, `CGI_GET_SHUTTER`. Parameters: `InputAdvanceCfg`, `Shutter`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `Shutter`, which the dispatch table does not list. */
  CGI_GET_SHUTTER: Command<readonly [typeof inputAdvanceCfg, typeof shutter]>;
  /** cmd 159, `CGI_SET_SHUTTER`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_SHUTTER: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 160, `CGI_GET_GAIN`. Parameters: `InputAdvanceCfg`, `Gain`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `Gain`, which the dispatch table does not list. */
  CGI_GET_GAIN: Command<readonly [typeof inputAdvanceCfg, typeof gain]>;
  /** cmd 161, `CGI_SET_GAIN`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_GAIN: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 162, `CGI_GET_SCENE`. Parameters: `InputAdvanceCfg`, `Scene`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `Scene`, which the dispatch table does not list. */
  CGI_GET_SCENE: Command<readonly [typeof inputAdvanceCfg, typeof scene]>;
  /** cmd 163, `CGI_SET_SCENE`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_SCENE: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 164, `CGI_GET_DAY_NIGHT_MODE`. Parameters: `InputAdvanceCfg`, `DayNightMode`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `DayNightMode`, which the dispatch table does not list. */
  CGI_GET_DAY_NIGHT_MODE: Command<
    readonly [typeof inputAdvanceCfg, typeof dayNightMode]
  >;
  /** cmd 165, `CGI_SET_DAY_NIGHT_MODE`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_DAY_NIGHT_MODE: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 166, `CGI_GET_IRCUT_MODE`. Parameters: `InputAdvanceCfg`, `IrcutMode`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `IrcutMode`, which the dispatch table does not list. */
  CGI_GET_IRCUT_MODE: Command<
    readonly [typeof inputAdvanceCfg, typeof ircutMode]
  >;
  /** cmd 167, `CGI_SET_IRCUT_MODE`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_IRCUT_MODE: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 168, `CGI_GET_BLC`. Parameters: `InputAdvanceCfg`, `BLC`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `BLC`, which the dispatch table does not list. */
  CGI_GET_BLC: Command<readonly [typeof inputAdvanceCfg, typeof blc]>;
  /** cmd 169, `CGI_SET_BLC`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_BLC: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 170, `CGI_GET_MIRROR`. Parameters: `InputAdvanceCfg`, `Mirror`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `Mirror`, which the dispatch table does not list. */
  CGI_GET_MIRROR: Command<readonly [typeof inputAdvanceCfg, typeof mirror]>;
  /** cmd 171, `CGI_SET_MIRROR`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_MIRROR: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 172, `CGI_GET_FLIP`. Parameters: `InputAdvanceCfg`, `Flip`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `Flip`, which the dispatch table does not list. */
  CGI_GET_FLIP: Command<readonly [typeof inputAdvanceCfg, typeof flip]>;
  /** cmd 173, `CGI_SET_FLIP`. Parameters: `InputAdvanceCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  CGI_SET_FLIP: Command<readonly [typeof inputAdvanceCfg]>;
  /** cmd 189, `IFRAME_REQUEST`. Parameters: `RequestIframe`. Firmware: RLC-823A, Video Doorbell PoE. */
  IFRAME_REQUEST: Command<readonly [typeof requestIframe]>;
  /** cmd 190, `GET_PTZ_PRESET_V20`. Parameters: `PtzPreset`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_PTZ_PRESET_V20: Command<readonly [typeof ptzPreset]>;
  /** cmd 191, `ONLINE_UPDATE_V20`. Parameters: `OnlineUpdate`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  ONLINE_UPDATE_V20: Command<readonly [typeof onlineUpdate]>;
  /** cmd 192, `START_ALARM_REPORT`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. Key suffixed with its id: the firmware table reuses the name `START_ALARM_REPORT` (also cmd 31). */
  START_ALARM_REPORT_192: Command<readonly []>;
  /** cmd 194, `FTP_TEST_V20`. Parameters: `Ftp`, `FtpTestResult`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `FtpTestResult`, which the dispatch table does not list. */
  FTP_TEST_V20: Command<readonly [typeof ftp, typeof ftpTestResult]>;
  /** cmd 195, `UPDATE_CFG_GET_V20`. Parameters: `AutoUpdate`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  UPDATE_CFG_GET_V20: Command<readonly [typeof autoUpdate]>;
  /** cmd 196, `UPDATE_CFG_SET_V20`. Parameters: `AutoUpdate`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  UPDATE_CFG_SET_V20: Command<readonly [typeof autoUpdate]>;
  /** cmd 197, `GET_ONLINE_NEW_FW_V20`. Parameters: `OnlineNewFirmwareInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_ONLINE_NEW_FW_V20: Command<readonly [typeof onlineNewFirmwareInfo]>;
  /** cmd 198, `GET_SCAN_AP_V20`. Parameters: `ScanAp`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_SCAN_AP_V20: Command<readonly [typeof scanAp]>;
  /** cmd 199, `GET_SUPPORT`. Parameters: `Support`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_SUPPORT: Command<readonly [typeof support]>;
  /** cmd 200, `WIFI_TEST_V20`. Parameters: `Wifi`. Firmware: RLC-823A, Video Doorbell PoE. */
  WIFI_TEST_V20: Command<readonly [typeof wifi]>;
  /** cmd 201, `TALK_OPEN_V20`. Parameters: `TalkConfig`. Firmware: RLC-823A, Video Doorbell PoE. */
  TALK_OPEN_V20: Command<readonly [typeof talkConfig]>;
  /** cmd 202, `TALK_FDX_STREAM_V20`. Parameters: `PARAM_DATA_V20`. Firmware: RLC-823A, Video Doorbell PoE. */
  TALK_FDX_STREAM_V20: Command<readonly [typeof paramDataV20]>;
  /** cmd 208, `GET_LED_STATE_V20`. Parameters: `LedState`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_LED_STATE_V20: Command<readonly [typeof ledState]>;
  /** cmd 209, `SET_LED_STATE_V20`. Parameters: `LedState`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_LED_STATE_V20: Command<readonly [typeof ledState]>;
  /** cmd 210, `GET_PTOP_CFG_V20`. Parameters: `PTOP`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_PTOP_CFG_V20: Command<readonly [typeof ptop]>;
  /** cmd 211, `SET_PTOP_CFG_V20`. Parameters: `PTOP`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_PTOP_CFG_V20: Command<readonly [typeof ptop]>;
  /** cmd 212, `GET_RF_CFG_V20`. Parameters: `rfAlarmCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_RF_CFG_V20: Command<readonly [typeof rfAlarmCfg]>;
  /** cmd 213, `SET_RF_CFG_V20`. Parameters: `rfAlarmCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_RF_CFG_V20: Command<readonly [typeof rfAlarmCfg]>;
  /** cmd 216, `SET_EMAILTASK_V20`. Parameters: `EmailTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_EMAILTASK_V20: Command<readonly [typeof emailTask]>;
  /** cmd 217, `GET_EMAILTASK_V20`. Parameters: `EmailTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_EMAILTASK_V20: Command<readonly [typeof emailTask]>;
  /** cmd 218, `SET_PUSHTASK_V20`. Parameters: `PushTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_PUSHTASK_V20: Command<readonly [typeof pushTask]>;
  /** cmd 219, `GET_PUSHTASK_V20`. Parameters: `PushTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_PUSHTASK_V20: Command<readonly [typeof pushTask]>;
  /** cmd 224, `GET_AUTO_FOCUS_V20`. Parameters: `AutoFocus`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_AUTO_FOCUS_V20: Command<readonly [typeof autoFocus]>;
  /** cmd 225, `SET_AUTO_FOCUS_V20`. Parameters: `AutoFocus`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_AUTO_FOCUS_V20: Command<readonly [typeof autoFocus]>;
  /** cmd 227, `GET_ONLINE_UPDATE_STATE`. Parameters: `upgradeState`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  GET_ONLINE_UPDATE_STATE: Command<readonly [typeof upgradeState]>;
  /** cmd 228, `GET_CROP_V20`. Parameters: `Crop`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_CROP_V20: Command<readonly [typeof crop]>;
  /** cmd 229, `SET_CROP_V20`. Parameters: `Crop`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_CROP_V20: Command<readonly [typeof crop]>;
  /** cmd 230, `CROP_SNAP_V20`. Parameters: `CropSnap`, `cropSnap`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `cropSnap`, which the dispatch table does not list. */
  CROP_SNAP_V20: Command<readonly [typeof cropSnap, typeof cropSnapReply]>;
  /** cmd 231, `SET_AUDIOTASK_V20`. Parameters: `AudioTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_AUDIOTASK_V20: Command<readonly [typeof audioTask]>;
  /** cmd 232, `GET_AUDIOTASK_V20`. Parameters: `AudioTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_AUDIOTASK_V20: Command<readonly [typeof audioTask]>;
  /** cmd 233, `SET_DEVICE_SLEEP`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_DEVICE_SLEEP: Command<readonly []>;
  /** cmd 235, `SET_CLOUD_TASK_V20`. Parameters: `CloudTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_CLOUD_TASK_V20: Command<readonly [typeof cloudTask]>;
  /** cmd 236, `GET_CLOUD_TASK_V20`. Parameters: `CloudTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_CLOUD_TASK_V20: Command<readonly [typeof cloudTask]>;
  /** cmd 253, `GET_BAT_INFO_V20`. Parameters: `ChargeBatteryInfo`, `BatteryInfo`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `BatteryInfo`, which the dispatch table does not list. */
  GET_BAT_INFO_V20: Command<
    readonly [typeof chargeBatteryInfo, typeof batteryInfo]
  >;
  /** cmd 256, `GET_4GNET_INFO`. Parameters: `Net3g4gInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_4GNET_INFO: Command<readonly [typeof net3g4gInfo]>;
  /** cmd 257, `GET_4GMODULE_INFO`. Parameters: `Net3g4gModuleInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_4GMODULE_INFO: Command<readonly [typeof net3g4gModuleInfo]>;
  /** cmd 259, `GET_BATTERY_REMAIN_V20`. Parameters: `BatteryRemainList`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_BATTERY_REMAIN_V20: Command<readonly [typeof batteryRemainList]>;
  /** cmd 260, `GET_AUDIO_INFO_V20`. Parameters: `audioFileInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_AUDIO_INFO_V20: Command<readonly [typeof audioFileInfo]>;
  /** cmd 261, `IMPORT_AUDIO_V20`. Parameters: `audioFileInfo`, `PARAM_DATA_V20`. Firmware: RLC-823A, Video Doorbell PoE. */
  IMPORT_AUDIO_V20: Command<
    readonly [typeof audioFileInfo, typeof paramDataV20]
  >;
  /** cmd 262, `SAVE_AUDIO_V20`. Parameters: `audioFileInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  SAVE_AUDIO_V20: Command<readonly [typeof audioFileInfo]>;
  /** cmd 263, `PLAY_AUDIO_V20`. Parameters: `audioPlayInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  PLAY_AUDIO_V20: Command<readonly [typeof audioPlayInfo]>;
  /** cmd 264, `GET_AUDIO_CFG_V20`. Parameters: `audioCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_AUDIO_CFG_V20: Command<readonly [typeof audioCfg]>;
  /** cmd 265, `SET_AUDIO_CFG_V20`. Parameters: `audioCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_AUDIO_CFG_V20: Command<readonly [typeof audioCfg]>;
  /** cmd 266, `MUTE_AUDIO_V20`. Parameters: `muteAudio`. Firmware: RLC-823A, Video Doorbell PoE. */
  MUTE_AUDIO_V20: Command<readonly [typeof muteAudio]>;
  /** cmd 267, `GET_AUDIO_ENCODE_ABILITY_V20`. Parameters: `AudioEncodeAbility`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_AUDIO_ENCODE_ABILITY_V20: Command<readonly [typeof audioEncodeAbility]>;
  /** cmd 268, `NEW_GET_CLOUD_BIND_INFO_V20`. Parameters: `CloudBindInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  NEW_GET_CLOUD_BIND_INFO_V20: Command<readonly [typeof cloudBindInfo]>;
  /** cmd 269, `NEW_BIND_CLOUD_V20`. Parameters: `BindCloud`. Firmware: RLC-823A, Video Doorbell PoE. */
  NEW_BIND_CLOUD_V20: Command<readonly [typeof bindCloud]>;
  /** cmd 270, `GET_CLOUD_CFG_V20`. Parameters: `CloudUploadCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_CLOUD_CFG_V20: Command<readonly [typeof cloudUploadCfg]>;
  /** cmd 271, `SET_CLOUD_CFG_V20`. Parameters: `CloudUploadCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_CLOUD_CFG_V20: Command<readonly [typeof cloudUploadCfg]>;
  /** cmd 272, `START_FIND_ALARM_VIDEO_V20`. Parameters: `findAlarmVideo`. Firmware: Video Doorbell PoE. */
  START_FIND_ALARM_VIDEO_V20: Command<readonly [typeof findAlarmVideo]>;
  /** cmd 273, `DO_FIND_ALARM_VIDEO_V20`. Parameters: `findAlarmVideo`, `alarmVideoInfo`. Firmware: Video Doorbell PoE. The reply carries `alarmVideoInfo`, which the dispatch table does not list. */
  DO_FIND_ALARM_VIDEO_V20: Command<
    readonly [typeof findAlarmVideo, typeof alarmVideoInfo]
  >;
  /** cmd 274, `STOP_FIND_ALARM_VIDEO_V20`. Parameters: `findAlarmVideo`. Firmware: Video Doorbell PoE. */
  STOP_FIND_ALARM_VIDEO_V20: Command<readonly [typeof findAlarmVideo]>;
  /** cmd 279, `BIND_NAS`. Parameters: `BindUnbindNas`. Firmware: RLC-823A, Video Doorbell PoE. */
  BIND_NAS: Command<readonly [typeof bindUnbindNas]>;
  /** cmd 280, `UNBIND_NAS`. Parameters: `BindUnbindNas`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  UNBIND_NAS: Command<readonly [typeof bindUnbindNas]>;
  /** cmd 281, `GET_BIND_INFO_V20`. Parameters: `BindNasInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_BIND_INFO_V20: Command<readonly [typeof bindNasInfoList]>;
  /** cmd 282, `GET_CLOUD_LOGIN_V20`. Parameters: `CloudLoginKey`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_CLOUD_LOGIN_V20: Command<readonly [typeof cloudLoginKey]>;
  /** cmd 283, `SET_CLOUD_LOGIN_V20`. Parameters: `CloudLoginKey`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_CLOUD_LOGIN_V20: Command<readonly [typeof cloudLoginKey]>;
  /** cmd 284, `SET_GOP_V20`. Parameters: `GopCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_GOP_V20: Command<readonly [typeof gopCfg]>;
  /** cmd 287, `SET_TIME_V20`. Parameters: `TimeCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_TIME_V20: Command<readonly [typeof timeCfg]>;
  /** cmd 288, `SET_FLOODLIGHT_STATUS`. Parameters: `FloodlightManual`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_FLOODLIGHT_STATUS: Command<readonly [typeof floodlightManual]>;
  /** cmd 289, `GET_FLOODLIGHT_TASK`. Parameters: `FloodlightTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_FLOODLIGHT_TASK: Command<readonly [typeof floodlightTask]>;
  /** cmd 290, `SET_FLOODLIGHT_TASK`. Parameters: `FloodlightTask`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_FLOODLIGHT_TASK: Command<readonly [typeof floodlightTask]>;
  /** cmd 294, `GET_ZOOM_FOCUS_INFO_V20`. Parameters: `ZoomFocusInfo`, `PtzZoomFocus`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `PtzZoomFocus`, which the dispatch table does not list. */
  GET_ZOOM_FOCUS_INFO_V20: Command<
    readonly [typeof zoomFocusInfo, typeof ptzZoomFocus]
  >;
  /** cmd 295, `GET_ZOOM_FOCUS_INFO_V20`. Parameters: `StartZoomFocus`. Firmware: RLC-823A, Video Doorbell PoE. Key suffixed with its id: the firmware table reuses the name `GET_ZOOM_FOCUS_INFO_V20` (also cmd 294). */
  GET_ZOOM_FOCUS_INFO_V20_295: Command<readonly [typeof startZoomFocus]>;
  /** cmd 296, `GET_DAY_NIGHT_THRESHOLD_V20`. Parameters: `DayNightThreshold`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DAY_NIGHT_THRESHOLD_V20: Command<readonly [typeof dayNightThreshold]>;
  /** cmd 297, `SET_DAY_NIGHT_THRESHOLD_V20`. Parameters: `DayNightThreshold`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_DAY_NIGHT_THRESHOLD_V20: Command<readonly [typeof dayNightThreshold]>;
  /** cmd 298, `COVER_PREVIEW`. Parameters: `CoverPreview`. Firmware: RLC-823A, Video Doorbell PoE. */
  COVER_PREVIEW: Command<readonly [typeof coverPreview]>;
  /** cmd 299, `GET_AI_CFG`. Parameters: `AiCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_AI_CFG: Command<readonly [typeof aiCfg]>;
  /** cmd 300, `SET_AI_CFG`. Parameters: `AiCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_AI_CFG: Command<readonly [typeof aiCfg]>;
  /** cmd 304, `GET_NAS_CFG`. Parameters: `NasUploadCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_NAS_CFG: Command<readonly [typeof nasUploadCfg]>;
  /** cmd 305, `SET_NAS_CFG`. Parameters: `NasUploadCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_NAS_CFG: Command<readonly [typeof nasUploadCfg]>;
  /** cmd 319, `GET_TIMELAPSE_CFG_V20`. Parameters: `timelapseCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_CFG_V20: Command<readonly [typeof timelapseCfg]>;
  /** cmd 320, `SET_TIMELAPSE_CFG_V20`. Parameters: `timelapseCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_TIMELAPSE_CFG_V20: Command<readonly [typeof timelapseCfg]>;
  /** cmd 321, `GET_TIMELAPSE_TASK_V20`. Parameters: `timelapseTasks`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_TASK_V20: Command<readonly [typeof timelapseTasks]>;
  /** cmd 322, `GET_TIMELAPSE_DATE_V20`. Parameters: `timelapseDateTbl`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_DATE_V20: Command<readonly [typeof timelapseDateTbl]>;
  /** cmd 323, `GET_TIMELAPSE_OPEN_V20`. Parameters: `timelapseFileSearch`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_OPEN_V20: Command<readonly [typeof timelapseFileSearch]>;
  /** cmd 324, `GET_TIMELAPSE_NEXT_V20`. Parameters: `timelapseFileSearch`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_NEXT_V20: Command<readonly [typeof timelapseFileSearch]>;
  /** cmd 325, `GET_TIMELAPSE_CLOSE_V20`. Parameters: `timelapseFileSearch`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_CLOSE_V20: Command<readonly [typeof timelapseFileSearch]>;
  /** cmd 326, `GET_TIMELAPSE_FILE_COVER_V20`. Parameters: `timelapseCover`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_FILE_COVER_V20: Command<readonly [typeof timelapseCover]>;
  /** cmd 327, `GET_TIMELAPSE_DOWNLOAD_V20`. Parameters: `timelapseDownload`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_DOWNLOAD_V20: Command<readonly [typeof timelapseDownload]>;
  /** cmd 328, `GET_TIMELAPSE_DLD_STOP_V20`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_TIMELAPSE_DLD_STOP_V20: Command<readonly []>;
  /** cmd 329, `GET_TIMELAPSE_DELETE_V20`. Parameters: `timelapseTaskDel`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  GET_TIMELAPSE_DELETE_V20: Command<readonly [typeof timelapseTaskDel]>;
  /** cmd 330, `GET_TIMELAPSE_FILE_DEL_V20`. Parameters: `timelapseFileDel`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  GET_TIMELAPSE_FILE_DEL_V20: Command<readonly [typeof timelapseFileDel]>;
  /** cmd 331, `SET_GUARD_V20`. Parameters: `PtzGuard`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_GUARD_V20: Command<readonly [typeof ptzGuard]>;
  /** cmd 332, `GET_GUARD_V20`. Parameters: `PtzGuard`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_GUARD_V20: Command<readonly [typeof ptzGuard]>;
  /** cmd 340, `GET_PTZ_AUTO_TEST_V20`. Parameters: `PtzAutoTest`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `PtzAutoTest`, which the dispatch table does not list. */
  GET_PTZ_AUTO_TEST_V20: Command<readonly [typeof ptzAutoTest]>;
  /** cmd 341, `PTZ_AUTO_TEST_V20`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. */
  PTZ_AUTO_TEST_V20: Command<readonly []>;
  /** cmd 342, `GET_AI_DETECT_CFG_V20`. Parameters: `AiDetectCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_AI_DETECT_CFG_V20: Command<readonly [typeof aiDetectCfg]>;
  /** cmd 343, `SET_AI_DETECT_CFG_V20`. Parameters: `AiDetectCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_AI_DETECT_CFG_V20: Command<readonly [typeof aiDetectCfg]>;
  /** cmd 344, `GET_DEF_AI_DETECT_CFG_V20`. Parameters: `AiDetectCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_DEF_AI_DETECT_CFG_V20: Command<readonly [typeof aiDetectCfg]>;
  /** cmd 345, `SET_ALARM_AREA_V20`. Parameters: `AlarmArea`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_ALARM_AREA_V20: Command<readonly [typeof alarmArea]>;
  /** cmd 346, `GET_SMT_PLAY_URL_V20`. Parameters: `SmtPlayUrl`, `SmtPlayURL`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `SmtPlayURL`, which the dispatch table does not list. */
  GET_SMT_PLAY_URL_V20: Command<
    readonly [typeof smtPlayUrl, typeof smtPlayUrlReply]
  >;
  /** cmd 347, `GET_AUDIO_FILE_INFO_LIST_V20`. Parameters: `audioFileInfoList`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `audioFileInfoList`, which the dispatch table does not list. */
  GET_AUDIO_FILE_INFO_LIST_V20: Command<readonly [typeof audioFileInfoList]>;
  /** cmd 348, `DELETE_AUDIO_FILE_V20`. Parameters: `audioFileInfo`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  DELETE_AUDIO_FILE_V20: Command<readonly [typeof audioFileInfo]>;
  /** cmd 349, `PLAY_ALARM_ALERTOR_V20`. Parameters: `audioFileInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  PLAY_ALARM_ALERTOR_V20: Command<readonly [typeof audioFileInfo]>;
  /** cmd 350, `STOP_ALARM_ALERTOR_V20`. No parameters. Firmware: RLC-823A, Video Doorbell PoE. */
  STOP_ALARM_ALERTOR_V20: Command<readonly []>;
  /** cmd 357, `GET_NETWORK_DIAGNOSIS_DATA_V20`. Parameters: `NetworkDiagnosisData`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_NETWORK_DIAGNOSIS_DATA_V20: Command<
    readonly [typeof networkDiagnosisData]
  >;
  /** cmd 358, `PUSH_TEST_V20`. Parameters: `PushTestResult`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `PushTestResult`, which the dispatch table does not list. */
  PUSH_TEST_V20: Command<readonly [typeof pushTestResult]>;
  /** cmd 362, `GET_AI_TRACK_DATA_V20`. Parameters: `AiTrackData`. Firmware: Video Doorbell PoE. */
  GET_AI_TRACK_DATA_V20: Command<readonly [typeof aiTrackData]>;
  /** cmd 363, `GET_PUSH_CFG_V20`. Parameters: `PushCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_PUSH_CFG_V20: Command<readonly [typeof pushCfg]>;
  /** cmd 364, `SET_PUSH_CFG_V20`. Parameters: `PushCfg`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_PUSH_CFG_V20: Command<readonly [typeof pushCfg]>;
  /** cmd 367, `CLOUD_TEST_V20`. Parameters: `CloudTestResult`. Firmware: RLC-823A, Video Doorbell PoE. The reply carries `CloudTestResult`, which the dispatch table does not list. */
  CLOUD_TEST_V20: Command<readonly [typeof cloudTestResult]>;
  /** cmd 368, `SET_AUDIO_FILE_INFO_LIST_V20`. Parameters: `audioFileInfoList`. Firmware: Video Doorbell PoE. */
  SET_AUDIO_FILE_INFO_LIST_V20: Command<readonly [typeof audioFileInfoList]>;
  /** cmd 381, `START_REPLAY_BY_TM`. Parameters: `ReplayByTimeV2`. Firmware: Video Doorbell PoE. */
  START_REPLAY_BY_TM: Command<readonly [typeof replayByTimeV2]>;
  /** cmd 382, `STOP_REPLAY_BY_TM`. Parameters: `ReplayByTimeV2`. Firmware: Video Doorbell PoE. */
  STOP_REPLAY_BY_TM: Command<readonly [typeof replayByTimeV2]>;
  /** cmd 383, `SEEK_REPLAY_BY_TM`. Parameters: `ReplaySeekV2`. Firmware: Video Doorbell PoE. */
  SEEK_REPLAY_BY_TM: Command<readonly [typeof replaySeekV2]>;
  /** cmd 391, `BIND_IOT_V20`. Parameters: `IOTBindUnBind`. Firmware: RLC-823A, Video Doorbell PoE. */
  BIND_IOT_V20: Command<readonly [typeof iotBindUnBind]>;
  /** cmd 392, `UNBIND_IOT_V20`. Parameters: `IOTBindUnBind`. Firmware: RLC-823A, Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  UNBIND_IOT_V20: Command<readonly [typeof iotBindUnBind]>;
  /** cmd 393, `GET_BIND_IOT_INFO_V20`. Parameters: `IOTBindInfoList`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_BIND_IOT_INFO_V20: Command<readonly [typeof iotBindInfoList]>;
  /** cmd 394, `GET_IOT_ACTION_V20`. Parameters: `IOTAction`, `IOTActionList`. Firmware: RLC-823A, Video Doorbell PoE. The RLC-823A firmware spells it `GET_IOT_ACTIONK_V20`. The reply carries `IOTActionList`, which the dispatch table does not list. */
  GET_IOT_ACTION_V20: Command<
    readonly [typeof iotAction, typeof iotActionList]
  >;
  /** cmd 395, `SET_IOT_ACTION_V20`. Parameters: `IOTAction`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_IOT_ACTION_V20: Command<readonly [typeof iotAction]>;
  /** cmd 410, `EXPORT_AUDIO_V20`. Parameters: `audioFileInfo`. Firmware: Video Doorbell PoE. */
  EXPORT_AUDIO_V20: Command<readonly [typeof audioFileInfo]>;
  /** cmd 420, `IMPORT_IMAGE_V20`. Parameters: `imageFileInfo`, `PARAM_DATA_V20`. Firmware: RLC-823A. */
  IMPORT_IMAGE_V20: Command<
    readonly [typeof imageFileInfo, typeof paramDataV20]
  >;
  /** cmd 421, `EXPORT_IMAGE_V20`. Parameters: `imageFileInfo`. Firmware: RLC-823A. */
  EXPORT_IMAGE_V20: Command<readonly [typeof imageFileInfo]>;
  /** cmd 427, `GET_AUTO_REPLY`. Parameters: `AutoReply`. Firmware: Video Doorbell PoE. */
  GET_AUTO_REPLY: Command<readonly [typeof autoReply]>;
  /** cmd 428, `SET_AUTO_REPLY`. Parameters: `AutoReply`. Firmware: Video Doorbell PoE. */
  SET_AUTO_REPLY: Command<readonly [typeof autoReply]>;
  /** cmd 433, `GET_PTZ_CUR_POS_V20`. Parameters: `ptzCurPos`. Firmware: RLC-823A. */
  GET_PTZ_CUR_POS_V20: Command<readonly [typeof ptzCurPos]>;
  /** cmd 434, `GET_AI_TRACK_LIMIT_V20`. Parameters: `trackLimit`. Firmware: RLC-823A. */
  GET_AI_TRACK_LIMIT_V20: Command<readonly [typeof trackLimit]>;
  /** cmd 435, `SET_AI_TRACK_LIMIT_V20`. Parameters: `trackLimit`. Firmware: RLC-823A. */
  SET_AI_TRACK_LIMIT_V20: Command<readonly [typeof trackLimit]>;
  /** cmd 436, `GET_AI_TRACK_TASK_V20`. Parameters: `trackSchedule`. Firmware: RLC-823A. */
  GET_AI_TRACK_TASK_V20: Command<readonly [typeof trackSchedule]>;
  /** cmd 437, `SET_AI_TRACK_TASK_V20`. Parameters: `trackSchedule`. Firmware: RLC-823A. */
  SET_AI_TRACK_TASK_V20: Command<readonly [typeof trackSchedule]>;
  /** cmd 445, `3D_LOCATION_V20`. Parameters: `Ptz3DLocation`. Firmware: RLC-823A. Firmware name `3D_LOCATION_V20`; prefixed so the key is an identifier. */
  PTZ_3D_LOCATION_V20: Command<readonly [typeof ptz3DLocation]>;
  /** cmd 453, `GET_AF_ALGORITHM_V20`. Parameters: `afAlgorithm`. Firmware: RLC-823A. */
  GET_AF_ALGORITHM_V20: Command<readonly [typeof afAlgorithm]>;
  /** cmd 454, `SET_AF_ALGORITHM_V20`. Parameters: `afAlgorithm`. Firmware: RLC-823A. */
  SET_AF_ALGORITHM_V20: Command<readonly [typeof afAlgorithm]>;
  /** cmd 455, `GET_HTTPS_CERT_INFO`. Parameters: `certificateInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  GET_HTTPS_CERT_INFO: Command<readonly [typeof certificateInfo]>;
  /** cmd 456, `SET_HTTPS_CERT_INFO`. Parameters: `certificateInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  SET_HTTPS_CERT_INFO: Command<readonly [typeof certificateInfo]>;
  /** cmd 483, `DINGDONG_CTRL`. Parameters: `dingdongCtrl`. Firmware: Video Doorbell PoE. */
  DINGDONG_CTRL: Command<readonly [typeof dingdongCtrl]>;
  /** cmd 484, `DINGDONG_LIST_GET`. Parameters: `dingdongList`. Firmware: Video Doorbell PoE. */
  DINGDONG_LIST_GET: Command<readonly [typeof dingdongList]>;
  /** cmd 485, `DINGDONG_DEV_OPT`. Parameters: `dingdongDeviceOpt`. Firmware: Video Doorbell PoE. */
  DINGDONG_DEV_OPT: Command<readonly [typeof dingdongDeviceOpt]>;
  /** cmd 486, `DINGDONG_CFG_GET`. Parameters: `dingdongCfg`. Firmware: Video Doorbell PoE. */
  DINGDONG_CFG_GET: Command<readonly [typeof dingdongCfg]>;
  /** cmd 487, `DINGDONG_CFG_SET`. Parameters: `dingdongCfg`. Firmware: Video Doorbell PoE. */
  DINGDONG_CFG_SET: Command<readonly [typeof dingdongCfg]>;
  /** cmd 509, `AUTH_MODE_CODE_GET`. Parameters: `authInfo`. Firmware: Video Doorbell PoE. */
  AUTH_MODE_CODE_GET: Command<readonly [typeof authInfo]>;
  /** cmd 511, `GET_SHARED_USER_CFG`. Parameters: `accessUserList`. Firmware: Video Doorbell PoE. */
  GET_SHARED_USER_CFG: Command<readonly [typeof accessUserList]>;
  /** cmd 512, `SET_SHARED_USER_CFG`. Parameters: `accessUserList`. Firmware: Video Doorbell PoE. */
  SET_SHARED_USER_CFG: Command<readonly [typeof accessUserList]>;
  /** cmd 513, `SYNC_SSID`. Parameters: `syncSSID`. Firmware: RLC-823A. */
  SYNC_SSID: Command<readonly [typeof syncSsid]>;
  /** cmd 522, `GET_CLIENT_ID`. Parameters: `PushClientID`. Firmware: Video Doorbell PoE. */
  GET_CLIENT_ID: Command<readonly [typeof pushClientId]>;
  /** cmd 524, `CREATE_PUSH_LISTENER`. Parameters: `PushCreateListener`. Firmware: Video Doorbell PoE. */
  CREATE_PUSH_LISTENER: Command<readonly [typeof pushCreateListener]>;
  /** cmd 525, `SYNC_CLIENT_LIST`. No parameters. Firmware: Video Doorbell PoE. */
  SYNC_CLIENT_LIST: Command<readonly []>;
  /** cmd 526, `GET_CLIENT_STATE`. Parameters: `PushClientState`. Firmware: Video Doorbell PoE. */
  GET_CLIENT_STATE: Command<readonly [typeof pushClientState]>;
  /** cmd 574, `GET_SLEEP_STATE`. Parameters: `sleepState`. Firmware: Video Doorbell PoE. */
  GET_SLEEP_STATE: Command<readonly [typeof sleepState]>;
  /** cmd 575, `SET_SLEEP_STATE`. Parameters: `sleepState`. Firmware: Video Doorbell PoE. */
  SET_SLEEP_STATE: Command<readonly [typeof sleepState]>;
  /** cmd 606, `NET_GET_FREQ_CORRECT_RESULT`. Parameters: `freqCorrectResult`. Firmware: Video Doorbell PoE. */
  NET_GET_FREQ_CORRECT_RESULT: Command<readonly [typeof freqCorrectResult]>;
  /** cmd 609, `GET_DINGDONG_SILENT_MODE`. Parameters: `dingdongSilentMode`. Firmware: Video Doorbell PoE. */
  GET_DINGDONG_SILENT_MODE: Command<readonly [typeof dingdongSilentMode]>;
  /** cmd 610, `SET_DINGDONG_SILENT_MODE`. Parameters: `dingdongSilentMode`. Firmware: Video Doorbell PoE. */
  SET_DINGDONG_SILENT_MODE: Command<readonly [typeof dingdongSilentMode]>;
  /** cmd 619, `INSTANT_PLAY_AUDIO`. Parameters: `audioFileInfo`, `PARAM_DATA_V20`. Firmware: Video Doorbell PoE. */
  INSTANT_PLAY_AUDIO: Command<
    readonly [typeof audioFileInfo, typeof paramDataV20]
  >;
  /** cmd 620, `SET_ANSWER_EVENT`. Parameters: `answerEvent`. Firmware: Video Doorbell PoE. */
  SET_ANSWER_EVENT: Command<readonly [typeof answerEvent]>;
  /** cmd 650, `DELETE_RECORD_FILE`. Parameters: `DeleteRecordFile`. Firmware: Video Doorbell PoE. Changes or erases device state; do not send it casually. */
  DELETE_RECORD_FILE: Command<readonly [typeof deleteRecordFile]>;
  /** cmd 720, `SET_AI_YUV_STREAM_CFG`. Parameters: `AIYUVCfg`. Firmware: Video Doorbell PoE. */
  SET_AI_YUV_STREAM_CFG: Command<readonly [typeof aiyuvCfg]>;
};

/**
 * The firmware request commands, for `Client.call`.
 *
 * @example Find a command by the id seen on the wire
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { COMMANDS } from "@hertzg/reolink-api/protocol/commands";
 *
 * const found = Object.values(COMMANDS).find((candidate) => candidate.id === 93);
 *
 * assertEquals(found?.name, "GET_LINK_TYPE");
 * ```
 *
 * @example List the commands only the doorbell registers
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { COMMANDS } from "@hertzg/reolink-api/protocol/commands";
 *
 * const doorbellOnly = Object.values(COMMANDS).filter((candidate) =>
 *   !candidate.firmware.includes("RLC-823A")
 * );
 *
 * assertEquals(doorbellOnly.some((candidate) => candidate.name === "DINGDONG_CTRL"), true);
 * ```
 */
export const COMMANDS: Commands = {
  HEART_BEAT_V20: command(0, "HEART_BEAT_V20", [heartBeat], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  LOGIN: command(1, "LOGIN", [
    loginUser,
    loginNet,
    ipcVersionList,
    deviceInfo,
    streamInfoList,
    loginErrInfo,
    accessInfo,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  LOGOUT: command(2, "LOGOUT", [loginUser], ["RLC-823A", "Video Doorbell PoE"]),
  START_PREVIEW: command(3, "START_PREVIEW", [preview], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  STOP_PREVIEW: command(4, "STOP_PREVIEW", [preview], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  START_REPLAY: command(5, "START_REPLAY", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  STOP_REPLAY: command(7, "STOP_REPLAY", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  DOWNLOAD_V20: command(8, "DOWNLOAD_V20", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  DOWNLOAD_STOP_V20: command(9, "DOWNLOAD_STOP_V20", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_TALK_ABILITY: command(10, "GET_TALK_ABILITY", [talkAbility], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  TALK_CLOSE_V20: command(11, "TALK_CLOSE_V20", [], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  FILE_INFO: command(13, "FILE_INFO", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SEARCH_OPEN: command(14, "SEARCH_OPEN", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SEARCH_FILE: command(15, "SEARCH_FILE", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SEARCH_CLOSE: command(16, "SEARCH_CLOSE", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  PTZ_CONTROL_V20: command(18, "PTZ_CONTROL_V20", [ptzControl], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  PTZ_PRESET_V20: command(19, "PTZ_PRESET_V20", [ptzPreset], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  PTZ_CRUISE_V20: command(20, "PTZ_CRUISE_V20", [ptzCruise], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  REBOOT_V20: command(23, "REBOOT_V20", [], ["RLC-823A", "Video Doorbell PoE"]),
  SETVEDIOPARAM_V20: command(25, "SETVEDIOPARAM_V20", [
    videoInput,
    inputAdvanceCfg,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GETVEDIOPARAM_V20: command(26, "GETVEDIOPARAM_V20", [
    videoInput,
    inputAdvanceCfg,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  START_ALARM_REPORT: command(31, "START_ALARM_REPORT", [], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_NETPORT_CFG_V20: command(36, "SET_NETPORT_CFG_V20", [
    serverPort,
    httpPort,
    rtspPort,
    onvifPort,
    httpsPort,
    rtmpPort,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_NETPORT_CFG_V20: command(37, "GET_NETPORT_CFG_V20", [
    serverPort,
    httpPort,
    rtspPort,
    onvifPort,
    httpsPort,
    rtmpPort,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_NTPCFG_V20: command(38, "GET_NTPCFG_V20", [ntp], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_NTPCFG_V20: command(39, "SET_NTPCFG_V20", [ntp], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_DDNSCFG_V20: command(40, "GET_DDNSCFG_V20", [ddns], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_DDNSCFG_V20: command(41, "SET_DDNSCFG_V20", [ddns], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_EMAILCFG_V20: command(42, "GET_EMAILCFG_V20", [email], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_EMAILCFG_V20: command(43, "SET_EMAILCFG_V20", [email], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_OSD_CFG_V20: command(
    44,
    "GET_OSD_CFG_V20",
    [osdChannelName, osdDatetime],
    ["RLC-823A", "Video Doorbell PoE"],
  ),
  SET_OSD_CFG_V20: command(
    45,
    "SET_OSD_CFG_V20",
    [osdChannelName, osdDatetime],
    ["RLC-823A", "Video Doorbell PoE"],
  ),
  GET_MD_CFG_V20: command(46, "GET_MD_CFG_V20", [md], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_MD_CFG_V20: command(47, "SET_MD_CFG_V20", [md], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_SHELTER_CFG_V20: command(52, "GET_SHELTER_CFG_V20", [shelter], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_SHELTER_CFG_V20: command(53, "SET_SHELTER_CFG_V20", [shelter], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_RECORD_V20: command(54, "GET_RECORD_V20", [recordCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_RECORD_V20: command(55, "SET_RECORD_V20", [recordCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_COMPRESSIONCFG_V20: command(56, "GET_COMPRESSIONCFG_V20", [compression], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_COMPRESSIONCFG_V20: command(57, "SET_COMPRESSIONCFG_V20", [compression], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_USERCFG_V20: command(58, "GET_USERCFG_V20", [abilitySuppport, userList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_USERCFG_V20: command(59, "SET_USERCFG_V20", [userList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_PTZCRUISE_V20: command(64, "GET_PTZCRUISE_V20", [ptzCruise], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  EXPORT_CFG_V20: command(65, "EXPORT_CFG_V20", [configFileInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  UPDATE_DEVICE: command(67, "UPDATE_DEVICE", [configFileInfo, paramDataV20], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_FTPCFG_V20: command(68, "GET_FTPCFG_V20", [ftp], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_FTPCFG_V20: command(69, "SET_FTPCFG_V20", [ftp], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_FTPTASK_V20: command(70, "GET_FTPTASK_V20", [ftpTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_FTPTASK_V20: command(71, "SET_FTPTASK_V20", [ftpTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_LOCAL_LINK_V20: command(76, "GET_LOCAL_LINK_V20", [
    dhcp,
    autoDns,
    ip,
    dns,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  SET_LOCAL_LINK_V20: command(77, "SET_LOCAL_LINK_V20", [
    dhcp,
    autoDns,
    ip,
    dns,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_VERSION_V20: command(80, "GET_VERSION_V20", [versionInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_RECSCHEDULE_V20: command(81, "GET_RECSCHEDULE_V20", [record], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_RECSCHEDULE_V20: command(82, "SET_RECSCHEDULE_V20", [record], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_LINK_TYPE: command(93, "GET_LINK_TYPE", [linkType], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_UPNPSTATE_V20: command(97, "GET_UPNPSTATE_V20", [upnp], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_UPNPSTATE_V20: command(98, "SET_UPNPSTATE_V20", [upnp], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_RESTORE_V20: command(99, "SET_RESTORE_V20", [restore], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_AUTO_REBOOT_CFG_V20: command(
    100,
    "SET_AUTO_REBOOT_CFG_V20",
    [autoReboot],
    ["RLC-823A", "Video Doorbell PoE"],
  ),
  GET_AUTO_REBOOT_CFG_V20: command(
    101,
    "GET_AUTO_REBOOT_CFG_V20",
    [autoReboot],
    ["RLC-823A", "Video Doorbell PoE"],
  ),
  GET_HDD_CFG_V20: command(102, "GET_HDD_CFG_V20", [hddInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  INIT_HDD_V20: command(103, "INIT_HDD_V20", [hddInitList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_SYSGENERAL_CFG_V20: command(104, "GET_SYSGENERAL_CFG_V20", [
    systemGeneral,
    norm,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  SET_SYSGENERAL_CFG_V20: command(105, "SET_SYSGENERAL_CFG_V20", [
    systemGeneral,
    norm,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_DST_CFG_V20: command(106, "GET_DST_CFG_V20", [dst], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_DST_CFG_V20: command(107, "SET_DST_CFG_V20", [dst], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SNAP_V20: command(109, "SNAP_V20", [snap], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_DEF_OSD_CFG_V20: command(110, "GET_DEF_OSD_CFG_V20", [
    osdChannelName,
    osdDatetime,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_DEF_INPUT_CFG_V20: command(111, "GET_DEF_INPUT_CFG_V20", [
    videoInput,
    shelter,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_DEF_ENC_CFG_V20: command(112, "GET_DEF_ENC_CFG_V20", [compression], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_DEF_MD_CFG_V20: command(113, "GET_DEF_MD_CFG_V20", [md], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_UID_CFG_V20: command(114, "GET_UID_CFG_V20", [uid], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_WIFI_SIGNAL_V20: command(115, "GET_WIFI_SIGNAL_V20", [wifiSignal], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_WIFI_INFO_V20: command(116, "GET_WIFI_INFO_V20", [wifi], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_WIFI_INFO_V20: command(117, "SET_WIFI_INFO_V20", [wifi], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_USER_ONLINE_V20: command(120, "GET_USER_ONLINE_V20", [onlineUserList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_USER_ONLINE_V20: command(121, "SET_USER_ONLINE_V20", [onlineUserList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  INFO_PERFORMANCE_V20: command(
    122,
    "INFO_PERFORMANCE_V20",
    [performanceInfo],
    ["RLC-823A", "Video Doorbell PoE"],
  ),
  REPLAY_SEEK: command(123, "REPLAY_SEEK", [replaySeek], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  PUSH_ADD_V20: command(124, "PUSH_ADD_V20", [pushInfo, pushRspInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  PUSH_DEL_V20: command(125, "PUSH_DEL_V20", [pushInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_DEF_ISP_CFG_V20: command(132, "GET_DEF_ISP_CFG_V20", [
    inputAdvanceCfg,
    videoInput,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  EMAIL_TEST_V20: command(141, "EMAIL_TEST_V20", [email], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_DAY_RECORD: command(142, "GET_DAY_RECORD", [dayRecords], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  DOWNLOAD_CUT_V20: command(143, "DOWNLOAD_CUT_V20", [fileInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  DOWNLOAD_CUT_STOP_V20: command(144, "DOWNLOAD_CUT_STOP_V20", [], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_ENC_CAPABILITY_V20: command(146, "GET_ENC_CAPABILITY_V20", [
    streamInfoList,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_ABILITY: command(151, "GET_ABILITY", [abilityInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_GET_POWER_LINE_FREQUENCY: command(154, "CGI_GET_POWER_LINE_FREQUENCY", [
    inputAdvanceCfg,
    powerLineFrequency,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  CGI_SET_POWER_LINE_FREQUENCY: command(155, "CGI_SET_POWER_LINE_FREQUENCY", [
    inputAdvanceCfg,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  CGI_GET_EXPOSURE: command(156, "CGI_GET_EXPOSURE", [
    inputAdvanceCfg,
    exposureCfg,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  CGI_SET_EXPOSURE: command(157, "CGI_SET_EXPOSURE", [inputAdvanceCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_GET_SHUTTER: command(158, "CGI_GET_SHUTTER", [inputAdvanceCfg, shutter], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_SET_SHUTTER: command(159, "CGI_SET_SHUTTER", [inputAdvanceCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_GET_GAIN: command(160, "CGI_GET_GAIN", [inputAdvanceCfg, gain], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_SET_GAIN: command(161, "CGI_SET_GAIN", [inputAdvanceCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_GET_SCENE: command(162, "CGI_GET_SCENE", [inputAdvanceCfg, scene], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_SET_SCENE: command(163, "CGI_SET_SCENE", [inputAdvanceCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_GET_DAY_NIGHT_MODE: command(164, "CGI_GET_DAY_NIGHT_MODE", [
    inputAdvanceCfg,
    dayNightMode,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  CGI_SET_DAY_NIGHT_MODE: command(165, "CGI_SET_DAY_NIGHT_MODE", [
    inputAdvanceCfg,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  CGI_GET_IRCUT_MODE: command(166, "CGI_GET_IRCUT_MODE", [
    inputAdvanceCfg,
    ircutMode,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  CGI_SET_IRCUT_MODE: command(167, "CGI_SET_IRCUT_MODE", [inputAdvanceCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_GET_BLC: command(168, "CGI_GET_BLC", [inputAdvanceCfg, blc], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_SET_BLC: command(169, "CGI_SET_BLC", [inputAdvanceCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_GET_MIRROR: command(170, "CGI_GET_MIRROR", [inputAdvanceCfg, mirror], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_SET_MIRROR: command(171, "CGI_SET_MIRROR", [inputAdvanceCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_GET_FLIP: command(172, "CGI_GET_FLIP", [inputAdvanceCfg, flip], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CGI_SET_FLIP: command(173, "CGI_SET_FLIP", [inputAdvanceCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  IFRAME_REQUEST: command(189, "IFRAME_REQUEST", [requestIframe], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_PTZ_PRESET_V20: command(190, "GET_PTZ_PRESET_V20", [ptzPreset], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  ONLINE_UPDATE_V20: command(191, "ONLINE_UPDATE_V20", [onlineUpdate], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  START_ALARM_REPORT_192: command(192, "START_ALARM_REPORT", [], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  FTP_TEST_V20: command(194, "FTP_TEST_V20", [ftp, ftpTestResult], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  UPDATE_CFG_GET_V20: command(195, "UPDATE_CFG_GET_V20", [autoUpdate], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  UPDATE_CFG_SET_V20: command(196, "UPDATE_CFG_SET_V20", [autoUpdate], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_ONLINE_NEW_FW_V20: command(197, "GET_ONLINE_NEW_FW_V20", [
    onlineNewFirmwareInfo,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_SCAN_AP_V20: command(198, "GET_SCAN_AP_V20", [scanAp], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_SUPPORT: command(199, "GET_SUPPORT", [support], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  WIFI_TEST_V20: command(200, "WIFI_TEST_V20", [wifi], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  TALK_OPEN_V20: command(201, "TALK_OPEN_V20", [talkConfig], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  TALK_FDX_STREAM_V20: command(202, "TALK_FDX_STREAM_V20", [paramDataV20], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_LED_STATE_V20: command(208, "GET_LED_STATE_V20", [ledState], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_LED_STATE_V20: command(209, "SET_LED_STATE_V20", [ledState], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_PTOP_CFG_V20: command(210, "GET_PTOP_CFG_V20", [ptop], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_PTOP_CFG_V20: command(211, "SET_PTOP_CFG_V20", [ptop], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_RF_CFG_V20: command(212, "GET_RF_CFG_V20", [rfAlarmCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_RF_CFG_V20: command(213, "SET_RF_CFG_V20", [rfAlarmCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_EMAILTASK_V20: command(216, "SET_EMAILTASK_V20", [emailTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_EMAILTASK_V20: command(217, "GET_EMAILTASK_V20", [emailTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_PUSHTASK_V20: command(218, "SET_PUSHTASK_V20", [pushTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_PUSHTASK_V20: command(219, "GET_PUSHTASK_V20", [pushTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_AUTO_FOCUS_V20: command(224, "GET_AUTO_FOCUS_V20", [autoFocus], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_AUTO_FOCUS_V20: command(225, "SET_AUTO_FOCUS_V20", [autoFocus], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_ONLINE_UPDATE_STATE: command(227, "GET_ONLINE_UPDATE_STATE", [
    upgradeState,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_CROP_V20: command(228, "GET_CROP_V20", [crop], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_CROP_V20: command(229, "SET_CROP_V20", [crop], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CROP_SNAP_V20: command(230, "CROP_SNAP_V20", [cropSnap, cropSnapReply], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_AUDIOTASK_V20: command(231, "SET_AUDIOTASK_V20", [audioTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_AUDIOTASK_V20: command(232, "GET_AUDIOTASK_V20", [audioTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_DEVICE_SLEEP: command(233, "SET_DEVICE_SLEEP", [], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_CLOUD_TASK_V20: command(235, "SET_CLOUD_TASK_V20", [cloudTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_CLOUD_TASK_V20: command(236, "GET_CLOUD_TASK_V20", [cloudTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_BAT_INFO_V20: command(253, "GET_BAT_INFO_V20", [
    chargeBatteryInfo,
    batteryInfo,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_4GNET_INFO: command(256, "GET_4GNET_INFO", [net3g4gInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_4GMODULE_INFO: command(257, "GET_4GMODULE_INFO", [net3g4gModuleInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_BATTERY_REMAIN_V20: command(259, "GET_BATTERY_REMAIN_V20", [
    batteryRemainList,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_AUDIO_INFO_V20: command(260, "GET_AUDIO_INFO_V20", [audioFileInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  IMPORT_AUDIO_V20: command(261, "IMPORT_AUDIO_V20", [
    audioFileInfo,
    paramDataV20,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  SAVE_AUDIO_V20: command(262, "SAVE_AUDIO_V20", [audioFileInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  PLAY_AUDIO_V20: command(263, "PLAY_AUDIO_V20", [audioPlayInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_AUDIO_CFG_V20: command(264, "GET_AUDIO_CFG_V20", [audioCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_AUDIO_CFG_V20: command(265, "SET_AUDIO_CFG_V20", [audioCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  MUTE_AUDIO_V20: command(266, "MUTE_AUDIO_V20", [muteAudio], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_AUDIO_ENCODE_ABILITY_V20: command(267, "GET_AUDIO_ENCODE_ABILITY_V20", [
    audioEncodeAbility,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  NEW_GET_CLOUD_BIND_INFO_V20: command(268, "NEW_GET_CLOUD_BIND_INFO_V20", [
    cloudBindInfo,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  NEW_BIND_CLOUD_V20: command(269, "NEW_BIND_CLOUD_V20", [bindCloud], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_CLOUD_CFG_V20: command(270, "GET_CLOUD_CFG_V20", [cloudUploadCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_CLOUD_CFG_V20: command(271, "SET_CLOUD_CFG_V20", [cloudUploadCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  START_FIND_ALARM_VIDEO_V20: command(272, "START_FIND_ALARM_VIDEO_V20", [
    findAlarmVideo,
  ], ["Video Doorbell PoE"]),
  DO_FIND_ALARM_VIDEO_V20: command(273, "DO_FIND_ALARM_VIDEO_V20", [
    findAlarmVideo,
    alarmVideoInfo,
  ], ["Video Doorbell PoE"]),
  STOP_FIND_ALARM_VIDEO_V20: command(274, "STOP_FIND_ALARM_VIDEO_V20", [
    findAlarmVideo,
  ], ["Video Doorbell PoE"]),
  BIND_NAS: command(279, "BIND_NAS", [bindUnbindNas], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  UNBIND_NAS: command(280, "UNBIND_NAS", [bindUnbindNas], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_BIND_INFO_V20: command(281, "GET_BIND_INFO_V20", [bindNasInfoList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_CLOUD_LOGIN_V20: command(282, "GET_CLOUD_LOGIN_V20", [cloudLoginKey], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_CLOUD_LOGIN_V20: command(283, "SET_CLOUD_LOGIN_V20", [cloudLoginKey], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_GOP_V20: command(284, "SET_GOP_V20", [gopCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_TIME_V20: command(287, "SET_TIME_V20", [timeCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_FLOODLIGHT_STATUS: command(288, "SET_FLOODLIGHT_STATUS", [
    floodlightManual,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_FLOODLIGHT_TASK: command(289, "GET_FLOODLIGHT_TASK", [floodlightTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_FLOODLIGHT_TASK: command(290, "SET_FLOODLIGHT_TASK", [floodlightTask], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_ZOOM_FOCUS_INFO_V20: command(294, "GET_ZOOM_FOCUS_INFO_V20", [
    zoomFocusInfo,
    ptzZoomFocus,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_ZOOM_FOCUS_INFO_V20_295: command(295, "GET_ZOOM_FOCUS_INFO_V20", [
    startZoomFocus,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_DAY_NIGHT_THRESHOLD_V20: command(296, "GET_DAY_NIGHT_THRESHOLD_V20", [
    dayNightThreshold,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  SET_DAY_NIGHT_THRESHOLD_V20: command(297, "SET_DAY_NIGHT_THRESHOLD_V20", [
    dayNightThreshold,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  COVER_PREVIEW: command(298, "COVER_PREVIEW", [coverPreview], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_AI_CFG: command(299, "GET_AI_CFG", [aiCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_AI_CFG: command(300, "SET_AI_CFG", [aiCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_NAS_CFG: command(304, "GET_NAS_CFG", [nasUploadCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_NAS_CFG: command(305, "SET_NAS_CFG", [nasUploadCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_TIMELAPSE_CFG_V20: command(319, "GET_TIMELAPSE_CFG_V20", [timelapseCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_TIMELAPSE_CFG_V20: command(320, "SET_TIMELAPSE_CFG_V20", [timelapseCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_TIMELAPSE_TASK_V20: command(321, "GET_TIMELAPSE_TASK_V20", [
    timelapseTasks,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_TIMELAPSE_DATE_V20: command(322, "GET_TIMELAPSE_DATE_V20", [
    timelapseDateTbl,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_TIMELAPSE_OPEN_V20: command(323, "GET_TIMELAPSE_OPEN_V20", [
    timelapseFileSearch,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_TIMELAPSE_NEXT_V20: command(324, "GET_TIMELAPSE_NEXT_V20", [
    timelapseFileSearch,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_TIMELAPSE_CLOSE_V20: command(325, "GET_TIMELAPSE_CLOSE_V20", [
    timelapseFileSearch,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_TIMELAPSE_FILE_COVER_V20: command(326, "GET_TIMELAPSE_FILE_COVER_V20", [
    timelapseCover,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_TIMELAPSE_DOWNLOAD_V20: command(327, "GET_TIMELAPSE_DOWNLOAD_V20", [
    timelapseDownload,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_TIMELAPSE_DLD_STOP_V20: command(328, "GET_TIMELAPSE_DLD_STOP_V20", [], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_TIMELAPSE_DELETE_V20: command(329, "GET_TIMELAPSE_DELETE_V20", [
    timelapseTaskDel,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_TIMELAPSE_FILE_DEL_V20: command(330, "GET_TIMELAPSE_FILE_DEL_V20", [
    timelapseFileDel,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  SET_GUARD_V20: command(331, "SET_GUARD_V20", [ptzGuard], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_GUARD_V20: command(332, "GET_GUARD_V20", [ptzGuard], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_PTZ_AUTO_TEST_V20: command(340, "GET_PTZ_AUTO_TEST_V20", [ptzAutoTest], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  PTZ_AUTO_TEST_V20: command(341, "PTZ_AUTO_TEST_V20", [], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_AI_DETECT_CFG_V20: command(342, "GET_AI_DETECT_CFG_V20", [aiDetectCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_AI_DETECT_CFG_V20: command(343, "SET_AI_DETECT_CFG_V20", [aiDetectCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_DEF_AI_DETECT_CFG_V20: command(344, "GET_DEF_AI_DETECT_CFG_V20", [
    aiDetectCfg,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  SET_ALARM_AREA_V20: command(345, "SET_ALARM_AREA_V20", [alarmArea], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_SMT_PLAY_URL_V20: command(346, "GET_SMT_PLAY_URL_V20", [
    smtPlayUrl,
    smtPlayUrlReply,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_AUDIO_FILE_INFO_LIST_V20: command(347, "GET_AUDIO_FILE_INFO_LIST_V20", [
    audioFileInfoList,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  DELETE_AUDIO_FILE_V20: command(
    348,
    "DELETE_AUDIO_FILE_V20",
    [audioFileInfo],
    ["RLC-823A", "Video Doorbell PoE"],
  ),
  PLAY_ALARM_ALERTOR_V20: command(349, "PLAY_ALARM_ALERTOR_V20", [
    audioFileInfo,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  STOP_ALARM_ALERTOR_V20: command(350, "STOP_ALARM_ALERTOR_V20", [], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_NETWORK_DIAGNOSIS_DATA_V20: command(
    357,
    "GET_NETWORK_DIAGNOSIS_DATA_V20",
    [networkDiagnosisData],
    ["RLC-823A", "Video Doorbell PoE"],
  ),
  PUSH_TEST_V20: command(358, "PUSH_TEST_V20", [pushTestResult], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_AI_TRACK_DATA_V20: command(362, "GET_AI_TRACK_DATA_V20", [aiTrackData], [
    "Video Doorbell PoE",
  ]),
  GET_PUSH_CFG_V20: command(363, "GET_PUSH_CFG_V20", [pushCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_PUSH_CFG_V20: command(364, "SET_PUSH_CFG_V20", [pushCfg], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  CLOUD_TEST_V20: command(367, "CLOUD_TEST_V20", [cloudTestResult], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_AUDIO_FILE_INFO_LIST_V20: command(368, "SET_AUDIO_FILE_INFO_LIST_V20", [
    audioFileInfoList,
  ], ["Video Doorbell PoE"]),
  START_REPLAY_BY_TM: command(381, "START_REPLAY_BY_TM", [replayByTimeV2], [
    "Video Doorbell PoE",
  ]),
  STOP_REPLAY_BY_TM: command(382, "STOP_REPLAY_BY_TM", [replayByTimeV2], [
    "Video Doorbell PoE",
  ]),
  SEEK_REPLAY_BY_TM: command(383, "SEEK_REPLAY_BY_TM", [replaySeekV2], [
    "Video Doorbell PoE",
  ]),
  BIND_IOT_V20: command(391, "BIND_IOT_V20", [iotBindUnBind], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  UNBIND_IOT_V20: command(392, "UNBIND_IOT_V20", [iotBindUnBind], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  GET_BIND_IOT_INFO_V20: command(393, "GET_BIND_IOT_INFO_V20", [
    iotBindInfoList,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  GET_IOT_ACTION_V20: command(394, "GET_IOT_ACTION_V20", [
    iotAction,
    iotActionList,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  SET_IOT_ACTION_V20: command(395, "SET_IOT_ACTION_V20", [iotAction], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  EXPORT_AUDIO_V20: command(410, "EXPORT_AUDIO_V20", [audioFileInfo], [
    "Video Doorbell PoE",
  ]),
  IMPORT_IMAGE_V20: command(420, "IMPORT_IMAGE_V20", [
    imageFileInfo,
    paramDataV20,
  ], ["RLC-823A"]),
  EXPORT_IMAGE_V20: command(421, "EXPORT_IMAGE_V20", [imageFileInfo], [
    "RLC-823A",
  ]),
  GET_AUTO_REPLY: command(427, "GET_AUTO_REPLY", [autoReply], [
    "Video Doorbell PoE",
  ]),
  SET_AUTO_REPLY: command(428, "SET_AUTO_REPLY", [autoReply], [
    "Video Doorbell PoE",
  ]),
  GET_PTZ_CUR_POS_V20: command(433, "GET_PTZ_CUR_POS_V20", [ptzCurPos], [
    "RLC-823A",
  ]),
  GET_AI_TRACK_LIMIT_V20: command(434, "GET_AI_TRACK_LIMIT_V20", [trackLimit], [
    "RLC-823A",
  ]),
  SET_AI_TRACK_LIMIT_V20: command(435, "SET_AI_TRACK_LIMIT_V20", [trackLimit], [
    "RLC-823A",
  ]),
  GET_AI_TRACK_TASK_V20: command(
    436,
    "GET_AI_TRACK_TASK_V20",
    [trackSchedule],
    ["RLC-823A"],
  ),
  SET_AI_TRACK_TASK_V20: command(
    437,
    "SET_AI_TRACK_TASK_V20",
    [trackSchedule],
    ["RLC-823A"],
  ),
  PTZ_3D_LOCATION_V20: command(445, "3D_LOCATION_V20", [ptz3DLocation], [
    "RLC-823A",
  ]),
  GET_AF_ALGORITHM_V20: command(453, "GET_AF_ALGORITHM_V20", [afAlgorithm], [
    "RLC-823A",
  ]),
  SET_AF_ALGORITHM_V20: command(454, "SET_AF_ALGORITHM_V20", [afAlgorithm], [
    "RLC-823A",
  ]),
  GET_HTTPS_CERT_INFO: command(455, "GET_HTTPS_CERT_INFO", [certificateInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  SET_HTTPS_CERT_INFO: command(456, "SET_HTTPS_CERT_INFO", [certificateInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  DINGDONG_CTRL: command(483, "DINGDONG_CTRL", [dingdongCtrl], [
    "Video Doorbell PoE",
  ]),
  DINGDONG_LIST_GET: command(484, "DINGDONG_LIST_GET", [dingdongList], [
    "Video Doorbell PoE",
  ]),
  DINGDONG_DEV_OPT: command(485, "DINGDONG_DEV_OPT", [dingdongDeviceOpt], [
    "Video Doorbell PoE",
  ]),
  DINGDONG_CFG_GET: command(486, "DINGDONG_CFG_GET", [dingdongCfg], [
    "Video Doorbell PoE",
  ]),
  DINGDONG_CFG_SET: command(487, "DINGDONG_CFG_SET", [dingdongCfg], [
    "Video Doorbell PoE",
  ]),
  AUTH_MODE_CODE_GET: command(509, "AUTH_MODE_CODE_GET", [authInfo], [
    "Video Doorbell PoE",
  ]),
  GET_SHARED_USER_CFG: command(511, "GET_SHARED_USER_CFG", [accessUserList], [
    "Video Doorbell PoE",
  ]),
  SET_SHARED_USER_CFG: command(512, "SET_SHARED_USER_CFG", [accessUserList], [
    "Video Doorbell PoE",
  ]),
  SYNC_SSID: command(513, "SYNC_SSID", [syncSsid], ["RLC-823A"]),
  GET_CLIENT_ID: command(522, "GET_CLIENT_ID", [pushClientId], [
    "Video Doorbell PoE",
  ]),
  CREATE_PUSH_LISTENER: command(524, "CREATE_PUSH_LISTENER", [
    pushCreateListener,
  ], ["Video Doorbell PoE"]),
  SYNC_CLIENT_LIST: command(525, "SYNC_CLIENT_LIST", [], [
    "Video Doorbell PoE",
  ]),
  GET_CLIENT_STATE: command(526, "GET_CLIENT_STATE", [pushClientState], [
    "Video Doorbell PoE",
  ]),
  GET_SLEEP_STATE: command(574, "GET_SLEEP_STATE", [sleepState], [
    "Video Doorbell PoE",
  ]),
  SET_SLEEP_STATE: command(575, "SET_SLEEP_STATE", [sleepState], [
    "Video Doorbell PoE",
  ]),
  NET_GET_FREQ_CORRECT_RESULT: command(606, "NET_GET_FREQ_CORRECT_RESULT", [
    freqCorrectResult,
  ], ["Video Doorbell PoE"]),
  GET_DINGDONG_SILENT_MODE: command(609, "GET_DINGDONG_SILENT_MODE", [
    dingdongSilentMode,
  ], ["Video Doorbell PoE"]),
  SET_DINGDONG_SILENT_MODE: command(610, "SET_DINGDONG_SILENT_MODE", [
    dingdongSilentMode,
  ], ["Video Doorbell PoE"]),
  INSTANT_PLAY_AUDIO: command(619, "INSTANT_PLAY_AUDIO", [
    audioFileInfo,
    paramDataV20,
  ], ["Video Doorbell PoE"]),
  SET_ANSWER_EVENT: command(620, "SET_ANSWER_EVENT", [answerEvent], [
    "Video Doorbell PoE",
  ]),
  DELETE_RECORD_FILE: command(650, "DELETE_RECORD_FILE", [deleteRecordFile], [
    "Video Doorbell PoE",
  ]),
  SET_AI_YUV_STREAM_CFG: command(720, "SET_AI_YUV_STREAM_CFG", [aiyuvCfg], [
    "Video Doorbell PoE",
  ]),
};

/** The messages the firmware pushes unasked, keyed by a descriptive name. */
export type Pushes = {
  /** cmd 33. Parameters: `AlarmEventList`. Firmware: RLC-823A, Video Doorbell PoE. */
  ALARM_EVENT_REPORT: Command<readonly [typeof alarmEventList]>;
  /** cmd 78. Parameters: `VideoInput`. Firmware: RLC-823A, Video Doorbell PoE. */
  VIDEO_INPUT_CHANGE_REPORT: Command<readonly [typeof videoInput]>;
  /** cmd 79. Parameters: `Serial`. Firmware: RLC-823A, Video Doorbell PoE. */
  SERIAL_CHANGE_REPORT: Command<readonly [typeof serial]>;
  /** cmd 234. No parameters. Firmware: Video Doorbell PoE. */
  BATTERY_CAMERA_HEARTBEAT: Command<readonly []>;
  /** cmd 252. Parameters: `BatteryList`. Firmware: RLC-823A, Video Doorbell PoE. */
  BATTERY_STATUS_REPORT: Command<readonly [typeof batteryList]>;
  /** cmd 255. Parameters: `Net3g4gInfo`. Firmware: RLC-823A, Video Doorbell PoE. */
  MOBILE_NETWORK_REPORT: Command<readonly [typeof net3g4gInfo]>;
  /** cmd 291. Parameters: `FloodlightStatusList`. Firmware: RLC-823A, Video Doorbell PoE. */
  FLOODLIGHT_STATUS_REPORT: Command<readonly [typeof floodlightStatusList]>;
  /** cmd 490. Parameters: `dingdongList`. Firmware: Video Doorbell PoE. */
  CHIME_SCAN_REPORT: Command<readonly [typeof dingdongList]>;
  /** cmd 623. Parameters: `sleepStatus`. Firmware: Video Doorbell PoE. */
  SLEEP_STATUS_REPORT: Command<readonly [typeof sleepStatus]>;
};

/**
 * The messages the firmware pushes unasked. Names are descriptive: the
 * firmware dispatch tables only list requests.
 *
 * @example Find the push for a command id
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { PUSHES } from "@hertzg/reolink-api/protocol/commands";
 *
 * const push = Object.values(PUSHES).find((candidate) => candidate.id === 79);
 *
 * assertEquals(push?.name, "SERIAL_CHANGE_REPORT");
 * ```
 */
export const PUSHES: Pushes = {
  ALARM_EVENT_REPORT: command(33, "ALARM_EVENT_REPORT", [alarmEventList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  VIDEO_INPUT_CHANGE_REPORT: command(78, "VIDEO_INPUT_CHANGE_REPORT", [
    videoInput,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  SERIAL_CHANGE_REPORT: command(79, "SERIAL_CHANGE_REPORT", [serial], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  BATTERY_CAMERA_HEARTBEAT: command(234, "BATTERY_CAMERA_HEARTBEAT", [], [
    "Video Doorbell PoE",
  ]),
  BATTERY_STATUS_REPORT: command(252, "BATTERY_STATUS_REPORT", [batteryList], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  MOBILE_NETWORK_REPORT: command(255, "MOBILE_NETWORK_REPORT", [net3g4gInfo], [
    "RLC-823A",
    "Video Doorbell PoE",
  ]),
  FLOODLIGHT_STATUS_REPORT: command(291, "FLOODLIGHT_STATUS_REPORT", [
    floodlightStatusList,
  ], ["RLC-823A", "Video Doorbell PoE"]),
  CHIME_SCAN_REPORT: command(490, "CHIME_SCAN_REPORT", [dingdongList], [
    "Video Doorbell PoE",
  ]),
  SLEEP_STATUS_REPORT: command(623, "SLEEP_STATUS_REPORT", [sleepStatus], [
    "Video Doorbell PoE",
  ]),
};
