# ADR 0003 - The package has one entry point and mirrors the ISAPI tree inside

`deno.json` exports only `"."`. `mod.ts` holds `createClient`, the `Client`
type, and re-exports the resources and types a consumer may need.
Everything under `isapi/` is internal and may be renamed freely; JSDoc
examples there import relatively.

Inside, folders follow the URL tree, and every module is one resource:

```
isapi/system/device-info.ts              /ISAPI/System/deviceInfo
isapi/content-mgmt/motion-detection.ts   /ISAPI/ContentMgmt/InputProxy/channels/{n}/video/motionDetection
isapi/smart/rules.ts                     /ISAPI/Smart/{type}/{channel}
isapi/event/alert-stream.ts              /ISAPI/Event/notification/alertStream
export const deviceInfo: Resource<DeviceInfo> = { path, codec };
export function motionDetection(target): Resource<MotionDetection>;
```

Sixteen sub-paths were sixteen stability contracts for files nobody imports
directly, and a folder called `config` named what one consumer does with
the documents, not what they are.

Ruled out:

- Exporting `./events/alert` and `./multipart/parts` as "useful alone".
  Replaying a capture works through the root's `parseAlert`, and a custom
  transport is not a use case anyone has.
