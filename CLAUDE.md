# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Deno monorepo published to JSR (jsr.io) containing binary structure encoding/decoding libraries and related utilities. The core package is `@hertzg/binstruct`, which provides type-safe binary data serialization with full TypeScript support. Additional packages implement format-specific decoders (PNG, WAV, Ethernet) and utilities (WireGuard configuration, CLI tools).

## Essential Commands

### Testing and Linting (MANDATORY)

**ALWAYS run these commands from project root before completing ANY coding task:**

```bash
# Run from project root - MANDATORY final check before completing work
deno task lint
deno task test
```

Both commands must pass with exit code 0 before any task is considered complete.

### Development Commands (Workspace Level)

For faster feedback during active development, run in individual workspace directories:

```bash
# Quick feedback loop during development
deno test
deno test --doc
deno lint
```

### Additional Commands

```bash
# Coverage reports
deno task cov              # View coverage summary
deno task cov:gen          # Generate lcov coverage
deno task cov:view         # View HTML coverage report

# Bump workspace versions
deno task bump
```

## Monorepo Structure

### Workspace Organization

- **Root**: Contains shared `import_map.json` and workspace configuration in `deno.json`
- **Packages**: Each workspace has its own `deno.json` with name, version, and exports
- **Publishing**: All packages follow JSR publishing conventions

### Workspaces

- `binstruct` - Core binary structure encoding/decoding library
- `binstruct-cli` - CLI tools for binary structure operations
- `binstruct-ethernet` - Ethernet frame parsing
- `binstruct-png` - PNG file format support
- `binstruct-wav` - WAV audio file format support
- `wg-keys` - WireGuard key management
- `wg-ini` - INI file parsing
- `wg-conf` - WireGuard configuration handling
- `mymagti-api` - MyMagti API client
- `bx` - Binary utilities

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

### Refiner Pattern

The `refine()` function transforms decoded values into refined types:

```typescript
// Transforms arrays to/from formatted strings
const macAddr = refine(array(u8be(), 6), {
  refine: (arr: number[]) => arr.map(b => b.toString(16).padStart(2, '0')).join(':'),
  unrefine: (mac: string) => mac.split(':').map(hex => parseInt(hex, 16)),
});
```

Used extensively in format-specific packages (PNG, Ethernet) to convert between binary and domain-specific representations.

## Dependency Management

### Critical Rules

- **NEVER** use `deps.ts` for dependency management
- **ALL** dependencies defined in root `import_map.json`
- Use bare imports throughout (e.g., `@std/assert`, `@hertzg/binstruct`)
- When **NOT** referencing public methods use `./something.ts` relative imports
- `node:` imports are allowed
- Import validation enforced by `deno task lint:import-map`

### Correct Import Patterns

```typescript
// ✅ Correct - Bare imports from import_map.json
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
- Examples are tested during `deno task test`
- Use realistic data demonstrating real-world usage
- Show both encoding and decoding operations
- Verify data integrity with assertions

Example structure:

```typescript
/**
 * Function description
 *
 * @param param Description
 * @returns Return value description
 *
 * @example Brief example description
 * ```ts
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
```

## Testing Standards

### Test Organization

- Use `Deno.test()` with descriptive names
- Group related tests logically
- Test positive and negative cases
- Include edge cases and error conditions

### Test Categories

1. **Unit Tests**: Individual function testing with edge cases
2. **Integration Tests**: Component interaction and data flow
3. **Round-trip Tests**: Essential for binary encoding/decoding - verify data integrity
4. **JSDoc Examples**: Treated as executable tests

### Assertion Patterns

```typescript
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
2. Run workspace-level commands for quick feedback (`deno test`, `deno lint`)
3. Fix issues and iterate
4. **Complete all code changes**
5. **Run `deno task lint` from project root**
6. Fix any linting issues
7. **Run `deno task test` from project root**
8. Fix any test failures
9. Repeat steps 5-8 until both commands pass
10. **Only then consider the task complete**

### Quality Gates

Both `deno task lint` and `deno task test` must pass before:
- Completing any coding task
- Committing code changes
- Considering work production-ready

## Common Patterns

### Binary Data Operations

- Document buffer size requirements in JSDoc
- Show encoding and decoding in examples
- Verify round-trip data integrity
- Support both platform-default and explicit endianness

### Struct Composition

Complex binary formats are built by composing coders:

```typescript
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

```typescript
const lengthCoder = u32le();
const data = struct({
  length: lengthCoder,
  payload: bytes(ref(lengthCoder)), // payload size from length field
});
```
