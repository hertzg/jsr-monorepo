# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a Bun workspace monorepo published to JSR (jsr.io) and npm, containing
binary structure encoding/decoding libraries and related utilities. The core
package is `@hertzg/binstruct`, which provides type-safe binary data
serialization with full TypeScript support. Additional packages implement format-specific decoders
(PNG, WAV, Ethernet) and utilities (WireGuard configuration, device API clients).

## Essential Commands

### Testing and Linting (MANDATORY)

**ALWAYS run these commands from project root before completing ANY coding
task:**

```bash
# Run from project root - MANDATORY final check before completing work
bun run lint
bun run test
```

Both commands must pass with exit code 0 before any task is considered complete.

`bun run lint` runs the type check (`tsc`), `oxlint`, the format check
(`dprint check`) and the `_tools` checks for imports, labeler and README.
`bun run fmt` rewrites files to the expected format.

Bun runs everything here (ADR 0012). Do not run any `deno` command: there is no
`deno.json`. Run `bun install` once after cloning.

Deno survives in one place, which you never invoke directly: `bun x jsr publish`
downloads its own pinned Deno to do the JSR publish.

### Development Commands (Workspace Level)

For faster feedback during active development, point the commands at one
package from the project root:

```bash
# Quick feedback loop during development
bun test packages/@hertzg/ip/              # unit tests
bun _tools/doctest.ts packages/@hertzg/ip  # JSDoc examples
bunx oxlint packages/@hertzg/ip
```

The path given to `bun test` is a substring match, so keep the trailing slash:
without it `packages/@binstruct/icmp` also runs the `icmpv6` tests.

The root `bun run test` is two subtasks that run concurrently. Run one alone
when only half the surface changed:

```bash
bun run test:doc   # JSDoc examples only - for documentation changes
bun run test:unit  # unit tests only - for changes with no JSDoc impact
```

Neither substitutes for the mandatory root `bun run test` before completing
work.

### Additional Commands

```bash
# Coverage reports
bun run cov                # Run tests and print a coverage summary
bun run cov:gen            # Write lcov coverage to cov/lcov.info

# Benchmarks and API docs
bun run bench              # Run *.bench.ts files with mitata
bun run docs               # Generate HTML API docs into docs/

# Publishing checks (see RELEASE.md)
bun run build:jsr          # Generate jsr.json beside every package.json
bun run build:npm          # Build npm packages into dist/
bun run verify:npm         # Install and import every built npm package
```

## Monorepo Structure

### Workspace Organization

- **Root**: `package.json` declares the Bun workspace (`workspaces` globs), the
  scripts above and the dev tooling. `bunfig.toml`, `tsconfig.json`,
  `dprint.json` and `.oxlintrc.json` configure install, type check, format and
  lint
- **Packages**: Each workspace has its own `package.json` with name, version,
  exports, `files` and dependencies. It is the only file that describes the
  package (ADR 0001)
- **Publishing**: Every package ships to JSR as TypeScript source and to npm as
  built JavaScript (ADR 0005, `RELEASE.md`). `jsr.json` files are generated and
  ignored by git - never edit or commit one

### Workspaces

Packages live under `packages/<scope>/<name>/` where the directory path mirrors
the JSR coordinate. Two scopes:

`packages/@hertzg/` — utilities and the core library:

- `binstruct` - Core binary structure encoding/decoding library
- `bx` - Binary hex string utilities
- `crc` - CRC checksum utilities
- `hikvision-api` - Hikvision ISAPI client (alert stream, device info, channels,
  motion grid, smart rules)
- `ip` - IPv4/IPv6/CIDR utilities
- `mac` - EUI-48 MAC address parse/stringify
- `mymagti-api` - MyMagti API client
- `reolink-api` - Reolink camera client over Baichuan (events, siren, privacy
  mode, snapshot, PTZ)
- `routeros-api` - MikroTik RouterOS API client
- `tplink-api` - TP-Link Router API client
- `wg-conf` - WireGuard configuration handling
- `wg-ini` - INI file parsing
- `wg-keys` - WireGuard key management
- `xhb` - HomeBank XHB file parse/serialize

`packages/@binstruct/` — format-specific binstruct decoders:

- `arp` - ARP packet parsing (RFC 826)
- `au` - Sun/NeXT `.au` audio file header
- `bfd` - BFD control packet mandatory section (RFC 5880)
- `bmp` - BMP/DIB image file format support
- `dos-mz` - DOS MZ executable header
- `esp` - IPsec ESP header parsing (RFC 4303)
- `ethernet` - Ethernet frame parsing
- `icmp` - ICMPv4 packet parsing (RFC 792)
- `icmpv6` - ICMPv6 message parsing (RFC 4443)
- `ico` - ICO/CUR icon directory header parsing
- `igmp` - IGMPv2 message parsing (RFC 2236)
- `inet` - Internet stack coder (Ethernet→IPv4→UDP/ICMP/ARP) + RFC 1071 checksum
- `ipv4` - IPv4 packet header parsing
- `ipv6` - IPv6 fixed header parsing (RFC 8200)
- `mbr` - Master Boot Record (MBR) partition table parsing
- `mp3` - MPEG audio (MP3) frame header parsing
- `ntp` - NTPv4 packet header parsing (RFC 5905)
- `pcap` - libpcap (.pcap) capture file format support
- `png` - PNG file format support
- `pppoe` - PPPoE header parsing (RFC 2516)
- `rtp` - RTP fixed header parsing (RFC 3550)
- `sll` - Linux cooked capture (DLT_LINUX_SLL) header parsing
- `sqlite` - SQLite database file header parsing
- `tar` - POSIX ustar tar archive header
- `tcp` - TCP segment parsing (RFC 9293)
- `tga` - Truevision TGA image header
- `tls-record` - TLS record layer header parsing (RFC 8446 section 5.1)
- `udp` - UDP datagram parsing (RFC 768)
- `vlan` - IEEE 802.1Q VLAN tag encoding/decoding
- `vxlan` - VXLAN header encoding/decoding (RFC 7348)
- `wav` - WAV audio file format support

## Core Architecture

### Binstruct Library Design

The `@hertzg/binstruct` package is built around three fundamental concepts:

1. **Coders**: Objects that implement both `encode` and `decode` methods
   - Identified by `kCoderKind` symbol to avoid string comparisons
   - Generic over the decoded type: `Coder<TDecoded>`
   - Always return `[value, bytesRead]` from decode operations

2. **Context System**: Context objects flow through encode/decode operations
   - Contains `direction` ("encode" or "decode")
   - Uses `kCtxRefs` symbol for internal reference storage
   - Avoids global state - all operations are context-aware
   - Created via `createContext(direction)` helper

3. **Reference System**: Enables self-referential and circular structures
   - `ref()` creates reference values for field-to-field dependencies
   - `computedRef()` creates computed references from multiple values
   - References stored in context via WeakMap for memory efficiency

4. **Single-Pass Processing**: All encoding/decoding operations work in a single
   forward pass
   - Fields are processed in declaration order (top to bottom)
   - References can only access **earlier** fields (forward-only references)
   - No backward references - fields cannot depend on values that come later
   - Structure field order matters - organize fields in dependency order
   - Enables optimal performance without multiple buffer passes or lookahead

### Refiner Pattern

The `refine()` function transforms decoded values into refined types:

```typescript ignore
// Transforms arrays to/from formatted strings
const macAddr = refine(array(u8be(), 6), {
  refine: (arr: number[]) =>
    arr.map((b) => b.toString(16).padStart(2, "0")).join(":"),
  unrefine: (mac: string) => mac.split(":").map((hex) => parseInt(hex, 16)),
});
```

Used extensively in format-specific packages (PNG, Ethernet) to convert between
binary and domain-specific representations.

## Dependency Management

### Critical Rules

- **NEVER** use `deps.ts` for dependency management
- A package's runtime dependencies are declared in **its own** `package.json`
  `dependencies` (ADR 0001):
  - sibling packages as `workspace:^`
  - `@std/*` through the JSR alias, e.g.
    `"@std/xml": "npm:@jsr/std__xml@^0.2.0"`
  - npm packages as a plain range
- Test-only dependencies (`@std/assert`, `@std/testing`, ...) live in the root
  `package.json` `devDependencies`, which also lists every workspace package as
  `workspace:*` so tests and JSDoc examples can import any of them by name
- Use bare imports throughout (e.g., `@std/assert`, `@hertzg/binstruct`)
- When **NOT** referencing public methods use `./something.ts` relative imports
- `node:` imports are allowed. `bun:` imports are not allowed in shipped source
- Import validation enforced by `bun run lint:imports`: shipped source may
  import only what the package's `dependencies` list, every listed dependency
  must be used, and a relative import may not leave the package

### Updating Dependencies

Edit the range in the `package.json` of the package that uses it, then run
`bun install` and commit `bun.lock` with it. There is nothing else to
regenerate.

The edit sits inside `packages/<scope>/<name>/`, which is what lets Release
Please attribute the bump to that package. It still needs a `fix` or `feat`
commit to produce a release: a `chore` commit bumps nothing.

New dependencies must also satisfy the age policy in ADR 0011: Bun will not
install a version published less than twelve hours ago.

### Correct Import Patterns

```typescript ignore
// ✅ Correct - Bare imports, declared in package.json
import { assertEquals } from "@std/assert";
import { struct } from "@hertzg/binstruct";

// ❌ Incorrect - NO deps.ts files
import { assertEquals } from "./deps.ts";
```

## Code Standards

### No Defensive Programming

- Assume users provide adequate buffer sizes
- Misuse causes undefined behavior - this is intentional
- Write comprehensive JSDoc instead of runtime checks
- Fail fast with meaningful errors only for critical validation

### Performance First

- Use `DataView` for binary operations
- Implement explicit endianness support (big-endian, little-endian)
- Use symbols for internal identifiers (avoid string comparisons)
- Context-aware operations enable efficient testing without global state

### Module Organization

- Named exports only (enables tree-shaking)
- Main `mod.ts` has comprehensive module-level JSDoc with `@module` tag
- All exported files must be treated as if it was the `mod.ts` of the package
- Place types alongside implementation (no separate `types.ts`)
- Prefer functions over classes
- Export types with `export type` for type-only exports

### Feature Implementation Guidelines

- **CRITICAL:** Make MINIMAL CHANGES to existing patterns and structures.
- **CRITICAL:** Preserve existing naming conventions and file organization.
- Follow project's established architecture and component patterns.
- Use existing utility functions and avoid duplicating functionality.

## Documentation Requirements

### JSDoc Standards

**ALL exported members MUST have JSDoc documentation** including:

- Description of functionality
- `@param` tags for all parameters
- `@returns` tags for return values
- `@example` blocks with executable assertions
- `@template` tags for generic types

### Example Quality

- Examples MUST be executable and use `assert*` functions
- **AVOID** `console.log` and comments in examples
- Examples are run during `bun run test` (by `_tools/doctest.ts`). They are
  run, not type-checked: a type error that still runs passes
- A block fenced `ts ignore` is skipped
- Use realistic data demonstrating real-world usage
- Show both encoding and decoding operations
- Verify data integrity with assertions
- Use `// deno-fmt-ignore` to preserve formatting of byte arrays and binary data
  when specific formatting aids readability (the formatter is dprint, configured
  in `dprint.json` to honor that comment)

Example structure:

````typescript ignore
/**
 * Function description
 *
 * @param param Description
 * @returns Return value description
 *
 * @example Brief example description
 * ```ts ignore
 * import { assertEquals } from "@std/assert";
 * import { func } from "@hertzg/package";
 *
 * // Setup
 * const result = func(input);
 *
 * // Assertions
 * assertEquals(result, expected);
 * ```
 */
````

## Testing Standards

### Test Organization

- Use `test()` from `node:test` with descriptive names, and `assert*` from
  `@std/assert`
- Group related tests logically, with `describe`/`it` from `node:test`.
  `@std/testing/bdd` does not work here: it calls `Deno.test`
- `@std/testing/mock` and `@std/testing/time` work and are the way to stub and
  fake time
- Test positive and negative cases
- Include edge cases and error conditions
- `bun test` does not count `t.test()` subtests in its summary, so a file with
  one test and ten subtests reports one test
- Snapshots use `expect(value).toMatchSnapshot()` from `bun:test`. A test file
  that imports `bun:test` must be added to `include` in `_tools/tsconfig.json`
  and to `exclude` in the root `tsconfig.json`, so Bun's global types do not
  leak into the packages
- Packages are type-checked with `lib: ["esnext"]` and `types: ["node"]`. There
  is no DOM lib, so DOM-only type names (`RequestInfo`, a global `CryptoKey`)
  are not available

```typescript ignore
import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parse } from "@hertzg/mac";

test("parse: colon-delimited", () => {
  assertEquals(
    parse("00:11:22:33:44:55"),
    new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
  );
});
```

### Test Categories

1. **Unit Tests**: Individual function testing with edge cases
2. **Integration Tests**: Component interaction and data flow
3. **Round-trip Tests**: Essential for binary encoding/decoding - verify data
   integrity
4. **JSDoc Examples**: Treated as executable tests

### Assertion Patterns

```typescript ignore
// Data integrity
assertEquals(decodedValue, originalValue);
// Note: Only when encode / decode is symmetrical (this is not always the case)
assertEquals(bytesRead, bytesWritten);

// Error handling
assertThrows(() => invalidOperation(), SpecificError);
await assertRejects(async () => await asyncInvalidOperation(), SpecificError);
```

## Workflow

### Development Workflow

1. Make code changes
2. Run workspace-level commands for quick feedback
   (`bun test packages/<scope>/<name>/`, `bunx oxlint packages/<scope>/<name>`)
3. Fix issues and iterate
4. **Complete all code changes**
5. **Run `bun run lint` from project root**
6. Fix any linting issues (`bun run fmt` fixes formatting)
7. **Run `bun run test` from project root**
8. Fix any test failures
9. Repeat steps 5-8 until both commands pass
10. **Only then consider the task complete**

### Quality Gates

Both `bun run lint` and `bun run test` must pass before:

- Completing any coding task
- Committing code changes
- Considering work production-ready

### Commit Message Rules

- Use Conventional Commits in the form `type(scope): summary`; these messages
  are consumed by Release Please.
- Only `feat`, `fix`, or `chore` types are allowed.
- A scope is mandatory and must consist solely of package names; use commas to
  list multiple packages.
- Release Please uses file paths to determine which packages are affected, and
  commit types to determine version bump level.
- Commit messages are used to generate the changelog—write concise, user-facing
  summaries.

#### Breaking Changes

When a commit introduces a breaking change, append `!` after the scope and
include a `BREAKING CHANGE:` footer in the commit body. Release Please uses this
to trigger a major version bump and generate the correct changelog entry.

```
feat(@hertzg/ip)!: auto-unwrap IPv4-mapped IPv6 in parseIp

BREAKING CHANGE: parseIp("::ffff:192.168.1.1") now returns a number instead of bigint.
```

#### Committing and Pushing

- Commit in reasonable, logical chunks — group related changes, separate
  unrelated ones.
- Always flag breaking changes with `!` and `BREAKING CHANGE:` footer so Release
  Please detects the correct version bump.
- Push after committing unless told otherwise.

#### Commit Message Examples

- ✅ `feat(@hertzg/binstruct): link submodule docs to jsr pages`
- ✅ `feat(@binstruct/png): fixed the png idat chunk parsing`
- ✅ `feat(@hertzg/ip)!: rename parse functions` (breaking change)
- ❌ `feat(hertzg/binstruct): link submodule docs to jsr pages`
- ❌ `feat(binstruct): bla bla`
- ❌ `feat(@nonexistent/pacakgename): bla bla`

#### Valid Commit Scopes

Commit scopes must match the `name` property in each workspace's `package.json`.
The CI pipeline fails if scopes are wrong, and the only recovery is to rebase
and reword commits—avoid this by double-checking scopes before committing.
Currently allowed scopes:

It is imperative that scopes are specified correctly or else the whole CI
pipeline fails and the only remedy is rebasing and rewording commits, which is
both tiresome and error-prone.

- `@hertzg/binstruct`
- `@binstruct/arp`
- `@binstruct/au`
- `@binstruct/bfd`
- `@binstruct/bmp`
- `@binstruct/dos-mz`
- `@binstruct/esp`
- `@binstruct/ethernet`
- `@binstruct/icmp`
- `@binstruct/icmpv6`
- `@binstruct/ico`
- `@binstruct/igmp`
- `@binstruct/inet`
- `@binstruct/ipv4`
- `@binstruct/ipv6`
- `@binstruct/mbr`
- `@binstruct/mp3`
- `@binstruct/ntp`
- `@binstruct/png`
- `@binstruct/pppoe`
- `@binstruct/rtp`
- `@binstruct/sll`
- `@binstruct/sqlite`
- `@binstruct/tar`
- `@binstruct/tcp`
- `@binstruct/tga`
- `@binstruct/tls-record`
- `@binstruct/udp`
- `@binstruct/vlan`
- `@binstruct/vxlan`
- `@binstruct/wav`
- `@binstruct/pcap`
- `@hertzg/wg-keys`
- `@hertzg/wg-ini`
- `@hertzg/wg-conf`
- `@hertzg/mymagti-api`
- `@hertzg/bx`
- `@hertzg/ip`
- `@hertzg/mac`
- `@hertzg/crc`
- `@hertzg/hikvision-api`
- `@hertzg/reolink-api`
- `@hertzg/routeros-api`
- `@hertzg/tplink-api`
- `@hertzg/xhb`

## Adding New Workspaces

Place the new package at `packages/<scope>/<name>/` matching its JSR coordinate
(e.g. `packages/@hertzg/foo/` for `@hertzg/foo`), with a `package.json` that
has `name`, `version`, `description`, `license`, `repository`, `type: "module"`,
`exports` (pointing at the `.ts` sources), `files` and `dependencies`. Copy a
sibling's `package.json` as the template. Then update:

1. **AGENTS.md** (this file):
   - Add the package to the per-scope list under "Workspaces"
   - Add the package name to the "Valid Commit Scopes" list

2. **README.md**:
   - Add the new package to the table with JSR badge

3. **Configuration files**:
   - `.github/labeler.yml` - Add label with package name and glob pattern
     (`packages/<scope>/<name>/**`)
   - `release-please-config.json` - Add a `packages/<scope>/<name>` entry with
     `"release-type": "node"`
   - `.release-please-manifest.json` - Add the same key with the starting
     version
   - Root `package.json` - Add `"<name>": "workspace:*"` to `devDependencies`,
     then run `bun install`, so tests and JSDoc examples can import the package
     by name

The root `package.json` `workspaces` field uses globs
(`packages/@binstruct/*`, `packages/@hertzg/*`), so package directories are
picked up automatically once they exist on disk — no need to list them.

The lint tools `lint:labeler` and `lint:readme` will fail if the labeler or the
README table is not updated correctly, and `lint:imports` fails if the new
package imports something its `package.json` does not declare. Nothing checks
the two Release Please files: a package missing from them is never released.

## Common Patterns

### Binary Data Operations

- Document buffer size requirements in JSDoc
- Show encoding and decoding in examples
- Verify round-trip data integrity
- Support both platform-default and explicit endianness

### Struct Composition

Complex binary formats are built by composing coders:

```typescript ignore
const header = struct({
  magic: string(4),
  version: u16le(),
  flags: u32be(),
});

const fileFormat = struct({
  header: header,
  data: bytes(ref(() => header.fields.size)),
});
```

### Reference Dependencies

Use `ref()` for field-to-field dependencies (e.g., length-prefixed data):

```typescript ignore
const lengthCoder = u32le();
const data = struct({
  length: lengthCoder,
  payload: bytes(ref(lengthCoder)), // payload size from length field
});
```

### Forward-Only References

Due to single-pass processing, fields can only reference earlier fields:

```typescript ignore
// ✅ Correct - length comes before data
const length = u32le();
const data = struct({
  length, // Decoded first
  payload: bytes(ref(length)), // Can reference earlier field
});

// ❌ Incorrect - cannot reference later fields
const length = u32le();
const invalid = struct({
  payload: bytes(ref(length)), // Error: length not in context yet
  length, // Decoded after payload
});

// ✅ Workaround - compute lengths during encode, structure fields in order
const dataLength = u32le();
const fileWithPadding = struct({
  dataLength, // Store computed length first
  data: bytes(ref(dataLength)), // Then the data
  padding: bytes(computedRef( // Then padding based on earlier fields
    [ref(dataLength)],
    (len) => (4 - (len % 4)) % 4, // Align to 4-byte boundary
  )),
});
```

## Agent skills

### Issue tracker

GitHub Issues via `gh`, on `hertzg/jsr-monorepo`. See
`docs/agents/issue-tracker.md`.

### Triage labels

Two category labels: `bug`, `enhancement`. Five state labels: `needs-triage`,
`needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. No overrides — a
triaged issue carries one of each. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: root-level decisions in `adr/`, per-package decisions in
`packages/<scope>/<name>/adr/`. `CONTEXT-MAP.md` at the root, per-package
`CONTEXT.md` files created lazily. See `docs/agents/domain.md`.

### Code navigation

When tracing where a symbol is defined or finding all references to it, use LSP
(`goToDefinition`, `findReferences`, `hover`) instead of Grep. LSP gives exact
results; Grep gives text matches.

Use Grep/Glob for discovery (finding files, searching patterns). Use LSP for
understanding (definitions, references, type info).

After locating a file with Grep/Glob, use LSP to navigate within it rather than
reading the whole file.

Not every agent has an LSP tool. Background subagents in particular do not — the
tool is absent from their registry, so it cannot be loaded on demand, while
foreground subagents load it normally. Without one, read the declaration itself
and compare its parameter names with the `@param` tags by hand. This matters
because nothing in `bun run lint` checks that a `@param` tag names a real
parameter, so a half-finished rename is invisible to the gate.
