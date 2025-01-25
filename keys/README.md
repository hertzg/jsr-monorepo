## Overview

This module provides functions to generate wireguard private keys, preshared keys and public keys.
Exposes functions that mimic `wg genkey`, `wg genpsk` and `wg pubkey` commands that work with strings.
As well as underlying functions that work with Uint8Arrays.

## Usage

```shell
deno add jsr:@hertzg/wg-keys
# or
npx jsr add @hertzg/wg-keys
```

Sample:

```typescript
import { wgGenKey, wgGenPsk, wgPubKey } from "@hertzg/wg-keys";

const privateKey = wgGenKey(); // returns string
const publicKey = wgPubKey(privateKey); // returns string
const presharedKey = wgGenPsk(); // returns string

console.log({ privateKey, publicKey, presharedKey });
```

or

```typescript
import {
  randomPrivateKeyBytes,
  publicBytesFromPrivateBytes,
  randomPresharedKeyBytes,
} from "@hertzg/wg-keys";

const privateKey = randomPrivateKeyBytes(); // returns Uint8Array
const publicKey = publicBytesFromPrivateBytes(privateKey); // returns Uint8Array
const presharedKey = randomPresharedKeyBytes(); // returns Uint8Array

console.log({ privateKey, publicKey, presharedKey });
```

## OK, But Why?

Normally one can use `CryptoSubtle` to generate and export keys, but since in Deno `x25519` private key export
as `jwk` is not implemented, this module provides a workaround using @noble/curves package. See
[X25519 issue](https://github.com/denoland/deno/issues/26431#issuecomment-2592044073) for more info.

## References

- [X25519 issue](https://github.com/denoland/deno/issues/26431#issuecomment-2592044073)
- [RFC 7748](https://datatracker.ietf.org/doc/html/rfc7748)
- [Curve25519](https://en.wikipedia.org/wiki/Curve25519)
