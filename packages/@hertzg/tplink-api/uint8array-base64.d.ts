// The ES2026 `Uint8Array` base64 and hex methods this package calls.
// TypeScript 5.9 ships no lib for them; they arrive as `esnext.typedarrays`
// in later releases. The signatures below are copied from that lib so the
// two merge cleanly, and this file can be deleted once the repo's TypeScript
// provides them.

// oxlint-disable-next-line eslint/no-redeclare
interface Uint8Array<TArrayBuffer extends ArrayBufferLike> {
  toBase64(
    options?: {
      alphabet?: "base64" | "base64url" | undefined;
      omitPadding?: boolean | undefined;
    },
  ): string;

  toHex(): string;
}

interface Uint8ArrayConstructor {
  fromBase64(
    string: string,
    options?: {
      alphabet?: "base64" | "base64url" | undefined;
      lastChunkHandling?:
        | "loose"
        | "strict"
        | "stop-before-partial"
        | undefined;
    },
  ): Uint8Array<ArrayBuffer>;

  fromHex(string: string): Uint8Array<ArrayBuffer>;
}
