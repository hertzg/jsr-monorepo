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

export * from "./ability-info.ts";
export * from "./ability-suppport.ts";
export * from "./access-info.ts";
export * from "./access-user-list.ts";
export * from "./af-algorithm.ts";
export * from "./af-learn-res.ts";
export * from "./af-learn.ts";
export * from "./aging-test.ts";
export * from "./ai-cfg.ts";
export * from "./ai-detect-cfg.ts";
export * from "./ai-track-data.ts";
export * from "./aiyuv-cfg.ts";
export * from "./alarm-area.ts";
export * from "./alarm-event-list.ts";
export * from "./alarm-video-info.ts";
export * from "./answer-event.ts";
export * from "./audio-cfg.ts";
export * from "./audio-encode-ability.ts";
export * from "./audio-file-info-list.ts";
export * from "./audio-file-info.ts";
export * from "./audio-play-info.ts";
export * from "./audio-task.ts";
export * from "./auth-info.ts";
export * from "./auto-dns.ts";
export * from "./auto-focus.ts";
export * from "./auto-reboot.ts";
export * from "./auto-reply.ts";
export * from "./auto-update.ts";
export * from "./band-width-test.ts";
export * from "./battery-info.ts";
export * from "./battery-list.ts";
export * from "./battery-remain-list.ts";
export * from "./bind-cloud.ts";
export * from "./bind-nas-info-list.ts";
export * from "./bind-unbind-nas.ts";
export * from "./bino-adjust.ts";
export * from "./blc.ts";
export * from "./button443.ts";
export * from "./certificate-info.ts";
export * from "./charge-battery-info.ts";
export * from "./cloud-bind-info.ts";
export * from "./cloud-login-key.ts";
export * from "./cloud-task.ts";
export * from "./cloud-test-result.ts";
export * from "./cloud-upload-cfg.ts";
export * from "./compression.ts";
export * from "./config-file-info.ts";
export * from "./cover-preview.ts";
export * from "./crop-snap-reply.ts";
export * from "./crop-snap.ts";
export * from "./crop.ts";
export * from "./day-night-mode.ts";
export * from "./day-night-threshold.ts";
export * from "./day-records.ts";
export * from "./ddns.ts";
export * from "./delete-record-file.ts";
export * from "./dev-body-code.ts";
export * from "./device-info.ts";
export * from "./dhcp.ts";
export * from "./dingdong-cfg.ts";
export * from "./dingdong-ctrl.ts";
export * from "./dingdong-device-opt.ts";
export * from "./dingdong-list.ts";
export * from "./dingdong-silent-mode.ts";
export * from "./dns.ts";
export * from "./doorbell-dingdingtest.ts";
export * from "./dst.ts";
export * from "./email-task.ts";
export * from "./email.ts";
export * from "./exposure-cfg.ts";
export * from "./file-info-list.ts";
export * from "./find-alarm-video.ts";
export * from "./flip.ts";
export * from "./floodlight-manual.ts";
export * from "./floodlight-status-list.ts";
export * from "./floodlight-task.ts";
export * from "./freq-correct-result.ts";
export * from "./ftp-task.ts";
export * from "./ftp-test-result.ts";
export * from "./ftp.ts";
export * from "./fty-audio-test.ts";
export * from "./fty-doorbell-test.ts";
export * from "./fty-image-detech-ret.ts";
export * from "./fty-snap-cfg.ts";
export * from "./fty-test-range.ts";
export * from "./gain.ts";
export * from "./gop-cfg.ts";
export * from "./hdd-info-list.ts";
export * from "./hdd-init-list.ts";
export * from "./heart-beat.ts";
export * from "./http-port.ts";
export * from "./https-port.ts";
export * from "./image-check.ts";
export * from "./image-file-info.ts";
export * from "./input-advance-cfg.ts";
export * from "./iot-action-list.ts";
export * from "./iot-action.ts";
export * from "./iot-bind-info-list.ts";
export * from "./iot-bind-un-bind.ts";
export * from "./ip.ts";
export * from "./ipc-version-list.ts";
export * from "./ir-cut-info.ts";
export * from "./ircut-mode.ts";
export * from "./led-state.ts";
export * from "./link-type.ts";
export * from "./login-err-info.ts";
export * from "./login-net.ts";
export * from "./login-user.ts";
export * from "./md.ts";
export * from "./mirror.ts";
export * from "./mute-audio.ts";
export * from "./nas-upload-cfg.ts";
export * from "./net3g4g-info.ts";
export * from "./net3g4g-module-info.ts";
export * from "./network-diagnosis-data.ts";
export * from "./norm.ts";
export * from "./ntp.ts";
export * from "./offset-adjust.ts";
export * from "./online-new-firmware-info.ts";
export * from "./online-update.ts";
export * from "./online-user-list.ts";
export * from "./onvif-port.ts";
export * from "./osd-channel-name.ts";
export * from "./osd-datetime.ts";
export * from "./param-data-v20.ts";
export * from "./performance-info.ts";
export * from "./peri-pheral-stat.ts";
export * from "./power-line-frequency.ts";
export * from "./preview.ts";
export * from "./ptop.ts";
export * from "./ptz-auto-test.ts";
export * from "./ptz-control.ts";
export * from "./ptz-cruise.ts";
export * from "./ptz-cur-pos.ts";
export * from "./ptz-guard.ts";
export * from "./ptz-preset.ts";
export * from "./ptz-zoom-focus.ts";
export * from "./ptz3-d-location.ts";
export * from "./push-cfg.ts";
export * from "./push-client-id.ts";
export * from "./push-client-state.ts";
export * from "./push-create-listener.ts";
export * from "./push-info.ts";
export * from "./push-rsp-info.ts";
export * from "./push-task.ts";
export * from "./push-test-result.ts";
export * from "./record-cfg.ts";
export * from "./record.ts";
export * from "./replay-by-time-v2.ts";
export * from "./replay-seek-v2.ts";
export * from "./replay-seek.ts";
export * from "./request-iframe.ts";
export * from "./restore.ts";
export * from "./rf-alarm-cfg.ts";
export * from "./rtmp-port.ts";
export * from "./rtsp-port.ts";
export * from "./scan-ap.ts";
export * from "./scene.ts";
export * from "./serial.ts";
export * from "./server-port.ts";
export * from "./shelter.ts";
export * from "./shutter.ts";
export * from "./sleep-state.ts";
export * from "./sleep-status.ts";
export * from "./smt-play-url-reply.ts";
export * from "./smt-play-url.ts";
export * from "./snap.ts";
export * from "./start-fty-image-clarity-detect.ts";
export * from "./start-zoom-focus.ts";
export * from "./stream-info-list.ts";
export * from "./sub1g-test.ts";
export * from "./support.ts";
export * from "./sync-ssid.ts";
export * from "./system-general.ts";
export * from "./t1-mic-test.ts";
export * from "./talk-ability.ts";
export * from "./talk-config.ts";
export * from "./time-cfg.ts";
export * from "./timelapse-cfg.ts";
export * from "./timelapse-cover.ts";
export * from "./timelapse-date-tbl.ts";
export * from "./timelapse-download.ts";
export * from "./timelapse-file-del.ts";
export * from "./timelapse-file-search.ts";
export * from "./timelapse-task-del.ts";
export * from "./timelapse-tasks.ts";
export * from "./track-limit.ts";
export * from "./track-schedule.ts";
export * from "./uid.ts";
export * from "./upgrade-state.ts";
export * from "./upnp.ts";
export * from "./user-list.ts";
export * from "./version-info.ts";
export * from "./video-input.ts";
export * from "./white-light-info.ts";
export * from "./wifi-signal.ts";
export * from "./wifi.ts";
export * from "./zf-backlash.ts";
export * from "./zoom-focus-info.ts";
