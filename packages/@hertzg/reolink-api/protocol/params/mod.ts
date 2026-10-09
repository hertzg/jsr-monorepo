/**
 * Codecs for every Baichuan parameter element the RLC-823A firmware
 * (`IPC_523SD10.2898_23110119`) reads or writes, one per element name.
 *
 * Each codec is an `XmlParam` from `@hertzg/reolink-api/protocol/xml`:
 * `encode` builds the element for a request, `decode` reads it from a reply
 * or push. Commands that carry them are in
 * `@hertzg/reolink-api/protocol/commands`.
 *
 * @example Read a pushed `<Serial>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { serial } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Serial version="1.1"><channelId>0</channelId><baudRate>9600</baudRate>' +
 *     "<dataBit>CS8</dataBit><stopBit>1</stopBit><parity>none</parity>" +
 *     "<flowControl>none</flowControl><controlProtocol>PELCO_D</controlProtocol>" +
 *     "<controlAddress>1</controlAddress></Serial>",
 * ).root;
 *
 * assertEquals(serial.decode(root).baudRate, 9600);
 * ```
 *
 * @module
 */

export { abilityInfo } from "./ability-info.ts";
export { abilitySuppport } from "./ability-suppport.ts";
export { afAlgorithm } from "./af-algorithm.ts";
export { afLearnRes } from "./af-learn-res.ts";
export { afLearn } from "./af-learn.ts";
export { agingTest } from "./aging-test.ts";
export { aiCfg } from "./ai-cfg.ts";
export { aiDetectCfg } from "./ai-detect-cfg.ts";
export { alarmArea } from "./alarm-area.ts";
export { alarmEventList } from "./alarm-event-list.ts";
export { audioCfg } from "./audio-cfg.ts";
export { audioEncodeAbility } from "./audio-encode-ability.ts";
export { audioFileInfo } from "./audio-file-info.ts";
export { audioPlayInfo } from "./audio-play-info.ts";
export { audioTask } from "./audio-task.ts";
export { autoDns } from "./auto-dns.ts";
export { autoFocus } from "./auto-focus.ts";
export { autoReboot } from "./auto-reboot.ts";
export { autoUpdate } from "./auto-update.ts";
export { bandWidthTest } from "./band-width-test.ts";
export { batteryList } from "./battery-list.ts";
export { batteryRemainList } from "./battery-remain-list.ts";
export { bindCloud } from "./bind-cloud.ts";
export { bindNasInfoList } from "./bind-nas-info-list.ts";
export { bindUnbindNas } from "./bind-unbind-nas.ts";
export { blc } from "./blc.ts";
export { certificateInfo } from "./certificate-info.ts";
export { chargeBatteryInfo } from "./charge-battery-info.ts";
export { cloudBindInfo } from "./cloud-bind-info.ts";
export { cloudLoginKey } from "./cloud-login-key.ts";
export { cloudTask } from "./cloud-task.ts";
export { cloudUploadCfg } from "./cloud-upload-cfg.ts";
export { compression } from "./compression.ts";
export { configFileInfo } from "./config-file-info.ts";
export { coverPreview } from "./cover-preview.ts";
export { cropSnap } from "./crop-snap.ts";
export { crop } from "./crop.ts";
export { dayNightMode } from "./day-night-mode.ts";
export { dayNightThreshold } from "./day-night-threshold.ts";
export { dayRecords } from "./day-records.ts";
export { ddns } from "./ddns.ts";
export { devBodyCode } from "./dev-body-code.ts";
export { dhcp } from "./dhcp.ts";
export { dns } from "./dns.ts";
export { dst } from "./dst.ts";
export { emailTask } from "./email-task.ts";
export { email } from "./email.ts";
export { exposureCfg } from "./exposure-cfg.ts";
export { fileInfoList } from "./file-info-list.ts";
export { flip } from "./flip.ts";
export { floodlightManual } from "./floodlight-manual.ts";
export { floodlightStatusList } from "./floodlight-status-list.ts";
export { floodlightTask } from "./floodlight-task.ts";
export { ftpTask } from "./ftp-task.ts";
export { ftp } from "./ftp.ts";
export { ftyAudioTest } from "./fty-audio-test.ts";
export { ftyImageDetechRet } from "./fty-image-detech-ret.ts";
export { ftySnapCfg } from "./fty-snap-cfg.ts";
export { ftyTestRange } from "./fty-test-range.ts";
export { gain } from "./gain.ts";
export { gopCfg } from "./gop-cfg.ts";
export { hddInfoList } from "./hdd-info-list.ts";
export { hddInitList } from "./hdd-init-list.ts";
export { heartBeat } from "./heart-beat.ts";
export { httpPort } from "./http-port.ts";
export { httpsPort } from "./https-port.ts";
export { imageCheck } from "./image-check.ts";
export { imageFileInfo } from "./image-file-info.ts";
export { inputAdvanceCfg } from "./input-advance-cfg.ts";
export { iotAction } from "./iot-action.ts";
export { iotBindInfoList } from "./iot-bind-info-list.ts";
export { iotBindUnBind } from "./iot-bind-un-bind.ts";
export { ip } from "./ip.ts";
export { ipcVersionList } from "./ipc-version-list.ts";
export { irCutInfo } from "./ir-cut-info.ts";
export { ircutMode } from "./ircut-mode.ts";
export { ledState } from "./led-state.ts";
export { linkType } from "./link-type.ts";
export { loginNet } from "./login-net.ts";
export { loginUser } from "./login-user.ts";
export { md } from "./md.ts";
export { mirror } from "./mirror.ts";
export { muteAudio } from "./mute-audio.ts";
export { nasUploadCfg } from "./nas-upload-cfg.ts";
export { net3g4gInfo } from "./net3g4g-info.ts";
export { net3g4gModuleInfo } from "./net3g4g-module-info.ts";
export { networkDiagnosisData } from "./network-diagnosis-data.ts";
export { norm } from "./norm.ts";
export { ntp } from "./ntp.ts";
export { onlineNewFirmwareInfo } from "./online-new-firmware-info.ts";
export { onlineUpdate } from "./online-update.ts";
export { onlineUserList } from "./online-user-list.ts";
export { onvifPort } from "./onvif-port.ts";
export { osdChannelName } from "./osd-channel-name.ts";
export { osdDatetime } from "./osd-datetime.ts";
export { paramDataV20 } from "./param-data-v20.ts";
export { performanceInfo } from "./performance-info.ts";
export { powerLineFrequency } from "./power-line-frequency.ts";
export { preview } from "./preview.ts";
export { ptop } from "./ptop.ts";
export { ptzControl } from "./ptz-control.ts";
export { ptzCruise } from "./ptz-cruise.ts";
export { ptzCurPos } from "./ptz-cur-pos.ts";
export { ptzGuard } from "./ptz-guard.ts";
export { ptzPreset } from "./ptz-preset.ts";
export { ptz3DLocation } from "./ptz3-d-location.ts";
export { pushCfg } from "./push-cfg.ts";
export { pushInfo } from "./push-info.ts";
export { pushTask } from "./push-task.ts";
export { recordCfg } from "./record-cfg.ts";
export { record } from "./record.ts";
export { replaySeek } from "./replay-seek.ts";
export { requestIframe } from "./request-iframe.ts";
export { restore } from "./restore.ts";
export { rfAlarmCfg } from "./rf-alarm-cfg.ts";
export { rtmpPort } from "./rtmp-port.ts";
export { rtspPort } from "./rtsp-port.ts";
export { scanAp } from "./scan-ap.ts";
export { scene } from "./scene.ts";
export { serial } from "./serial.ts";
export { serverPort } from "./server-port.ts";
export { shelter } from "./shelter.ts";
export { shutter } from "./shutter.ts";
export { smtPlayUrl } from "./smt-play-url.ts";
export { snap } from "./snap.ts";
export { startFtyImageClarityDetect } from "./start-fty-image-clarity-detect.ts";
export { startZoomFocus } from "./start-zoom-focus.ts";
export { streamInfoList } from "./stream-info-list.ts";
export { support } from "./support.ts";
export { syncSsid } from "./sync-ssid.ts";
export { systemGeneral } from "./system-general.ts";
export { talkAbility } from "./talk-ability.ts";
export { talkConfig } from "./talk-config.ts";
export { timeCfg } from "./time-cfg.ts";
export { timelapseCfg } from "./timelapse-cfg.ts";
export { timelapseCover } from "./timelapse-cover.ts";
export { timelapseDateTbl } from "./timelapse-date-tbl.ts";
export { timelapseDownload } from "./timelapse-download.ts";
export { timelapseFileDel } from "./timelapse-file-del.ts";
export { timelapseFileSearch } from "./timelapse-file-search.ts";
export { timelapseTaskDel } from "./timelapse-task-del.ts";
export { timelapseTasks } from "./timelapse-tasks.ts";
export { trackLimit } from "./track-limit.ts";
export { trackSchedule } from "./track-schedule.ts";
export { uid } from "./uid.ts";
export { upgradeState } from "./upgrade-state.ts";
export { upnp } from "./upnp.ts";
export { userList } from "./user-list.ts";
export { versionInfo } from "./version-info.ts";
export { videoInput } from "./video-input.ts";
export { whiteLightInfo } from "./white-light-info.ts";
export { wifiSignal } from "./wifi-signal.ts";
export { wifi } from "./wifi.ts";
export { zfBacklash } from "./zf-backlash.ts";
export { zoomFocusInfo } from "./zoom-focus-info.ts";
