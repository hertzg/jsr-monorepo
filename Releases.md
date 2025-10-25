### 2025.10.25

#### @hertzg/binstruct 3.0.2 (patch)

- chore(@hertzg/binstruct): refresh documentation guidance

### 2025.10.25

#### @hertzg/binstruct 3.0.1 (patch)

- fix(binstruct): cross-link exported submodules in module docs\
- fix(binstruct): update docs
- chore(binstruct): length docs
- chore(binstruct): isCoder docs

### 2025.10.25

#### @binstruct/png 0.1.3 (patch)

- feat(@binstruct/png): enhance PNG file structure and chunk handling
- fix(@binstruct/png): add context parameter to refine and unrefine methods in
  IEND and IHDR chunk refiners for proper decoding and encoding
- fix(@binstruct/png): include context parameter in refine and unrefine methods
  for proper decoding and encoding
- refactor(@binstruct/png): migrate to refineSwitch for chunk type handling
- refactor(@binstruct/png): remove 1x1 PNG file and associated JSON metadata,
  update idatChunkRefiner to include context parameter for decoding and encoding

#### @hertzg/binstruct 3.0.0 (major)

- feat(binstruct): add refineSwitch for conditional refinement and multi-stage
  encoding/decoding
- fix(binstruct)!: remove unused buffer parameter from refine and unrefine
  methods
- fix(binstruct)!: update Refiner type to use never[] for TArgs and simplify
  function signatures
- chore(binstruct): apply linting fixes for import ordering and formatting

### 2025.10.19

#### @hertzg/binstruct 2.0.0 (major)

- fix(binstruct)!: update refine and unrefine methods to include context and
  buffer parameters in tests
- fix(binstruct)!: update refine and unrefine methods to include buffer and
  context parameters
- fix(binstruct): clarify context parameter type in decode function
- fix(binstruct)!: rename refiner methods for clarity

### 2025.10.17

#### @hertzg/binstruct 1.0.1 (patch)

- fix(binstruct): enhance autoGrowBuffer tests for edge cases and validation

### 2025.10.17

#### @hertzg/binstruct 1.0.0 (major)

- feat(binstruct): add autoGrowBuffer for dynamic buffer management
- fix(binstruct): update @hertzg/binstruct version to 1.0.0 and fix buffer
  export path
- chore(binstruct): bump version to 1.0.0

### 2025.10.16

#### @hertzg/binstruct 0.2.2 (patch)

- feat(binstruct): export decode and encode helpers functions

### 2025.10.13

#### @binstruct/cli 0.1.1 (patch)

- feat(@binstruct/cli): improve JSON serialization by modularizing conversion
  and formatting

### 2025.10.13

#### @hertzg/binstruct 0.2.1 (patch)

- fix(binstruct): force release

### 2025.10.13

#### @binstruct/cli 0.1.0 (minor)

- feat(@binstruct/cli): enhance CLI to support JSONC format and positional
  arguments
- feat(@binstruct/cli): integrate @std/cli and @std/jsonc for enhanced CLI
  functionality
- feat(@binstruct/cli): update CLI help command and clean up examples
- feat(@binstruct/cli): introduce @binstruct/cli helper

### 2025.10.13

#### @binstruct/png 0.1.2 (patch)

- feat(@binstruct/png): add chunkCrc function and enhance tests for PNG chunk
  handling

### 2025.10.13

#### @binstruct/ethernet 0.1.1 (minor)

- feat(binstruct,@binstruct/ethernet): update binstruct module exports and add
  new dependency
- fix(*): bump all versions
- fix(*): add missing newline at end of deno.json file

#### @binstruct/png 0.1.1 (minor)

- feat(binstruct,@binstruct/png): enhance binstruct module exports and improve
  PNG import structure
- feat(@binstruct/png): add binstruct-png module for PNG encoding/decoding
- fix(*): bump all versions
- fix(*): add missing newline at end of deno.json file

#### @binstruct/wav 0.1.1 (minor)

- feat(@binstruct/wav): add new binstruct-wav
- fix(*): bump all versions
- fix(@binstruct/wav): update WAV encoding/decoding tests for accuracy
- fix(*): add missing newline at end of deno.json file

#### @hertzg/binstruct 0.2.0 (minor)

- feat(binstruct,@binstruct/png): enhance binstruct module exports and improve
  PNG import structure
- feat(binstruct,@binstruct/ethernet): update binstruct module exports and add
  new dependency
- feat(binstruct): add documentation for kIsRefValue symbol identifier
- feat(binstruct): enhance documentation with detailed comments for coders,
  contexts, and numeric types
- fix(binstruct): update import paths for refSetValue and Endianness
- fix(binstruct): bump version
- refactor(binstruct): consolidate numeric exports and remove example code from
  Endianness documentation
- refactor(binstruct): streamline numeric type definitions and enhance
  documentation for endianness handling
- refactor(binstruct): reorganize and clean up symbol definitions for numeric
  types
- chore(binstruct): add docs for ref exports
- chore(binstruct): update @hertzg/binstruct version to 0.1.8
- chore(binstruct): document changes for version 0.1.8 in Releases.md
- chore(binstruct): update version to 0.1.8 in deno.json

#### @hertzg/bx 3.0.2 (patch)

- fix(bx): fake fix

#### @hertzg/mymagti-api 0.1.0 (minor)

- feat(mymagti-api): add comprehensive documentation for OAuth types and
  functions

#### @hertzg/wg-conf 0.2.0 (minor)

- feat(wg-conf): enhance WireGuard configuration interfaces with detailed
  documentation

#### @hertzg/wg-ini 0.2.0 (minor)

- feat(wg-ini): enhance INI line and section handling with detailed
  documentation for streams and options

#### @hertzg/wg-keys 1.0.1 (patch)

- fix(*): bump all versions
- fix(*): add missing newline at end of deno.json file

### 2025.08.22

#### @hertzg/binstruct 0.1.8 (patch)

- chore(binstruct): update version to 0.1.8 in deno.json

### 2025.08.22

#### @hertzg/binstruct 0.1.7 (patch)

- feat(binstruct): add data refinement functionality
- fix(binstruct): import paths in binstruct string modules to use relative paths
  instead of @hertzg/binstruct/ref
- refactor(binstruct): improve documentation in mod.ts
- refactor(binstruct): clean up imports in examples.test.ts by removing unused
  ArrayWhileCondition
- refactor(binstruct): update examples.test.ts to use conditional array for TLVs
  and improve decoding buffer handling
- refactor(binstruct): add ArrayWhileCondition type export to array module for
  enhanced type support
- chore(binstruct): remove unused test files test_type_inference.ts and
  validate_computed_ref_fix.ts
- chore(binstruct): add tlsg example
- chore(binstruct): update version to 0.1.7 and document changes in Releases.md

### 2025.08.20

#### @hertzg/binstruct 0.1.7 (patch)

- fix(binstruct): import paths in binstruct string modules to use relative paths
  instead of @hertzg/binstruct/ref

### 2025.08.19

#### @hertzg/binstruct 0.1.6 (patch)

- feat(binstruct): enhance array function to support conditional arrays and add
  isLengthOrRef utility
- fix(binstruct): update import paths in length.ts for consistency
- fix(binstruct): update import path for assertion functions in struct tests
- fix(binstruct): refactor the whole thing
- refactor(binstruct): consolidate imports and replace arrayFL with array for
  consistency in ref.ts
- refactor(binstruct): add support for conditional arrays and update example
  data in array.ts
- refactor(binstruct): reorganize exports in string.ts for better accessibility
- refactor(binstruct): remove example documentation from isCoder function for
  improved readability
- refactor(binstruct): remove extensive documentation comments from length.ts
  for cleaner code
- refactor(binstruct): reorganize exports in mod.ts for improved structure and
  clarity
- refactor(binstruct): remove redundant file list from deno.json
- refactor(binstruct): export string kind symbols for fixed-length,
  length-prefixed, and null-terminated strings
- test(binstruct): add unit tests for arrayWhile functionality and export
  kKindArrayWhile symbol
- test(binstruct): add unit tests for fixed-length array coder functionality
- test(binstruct): add tests for array coders and export kind symbols
- test(binstruct): refactor string tests for clarity and consistency
- chore(binstruct): remove unnecessary blank line in length-prefixed array file

### 2025.08.16

#### @hertzg/binstruct 0.1.5 (patch)

- docs(binstruct): enhance examples with assertions for better clarity and error
  handling
- docs(binstruct): clarify user responsibility for buffer size in module
  documentation
- chore(binstruct): add comprehensive module documentation and examples for
  array, bytes, length, numeric, ref, string, and struct coders

#### @hertzg/mymagti-api 0.0.5 (patch)

- docs(mymagti-api): add comprehensive module documentation and usage examples
  for OAuth token fetching

#### @hertzg/wg-conf 0.1.8 (patch)

- docs(wg-conf): enhance module documentation with high-level helpers for
  parsing and stringifying WireGuard wg-quick configuration files

#### @hertzg/wg-ini 0.1.8 (patch)

- docs(wg-ini): add high-level module documentation and usage examples for INI
  data parsing and stringifying utilities

### 2025.08.15

#### @hertzg/binstruct 0.1.4 (patch)

- feat(binstruct): more examples
- feat(binstruct): enhance string coder with automatic type selection and
  comprehensive tests
- feat(binstruct): implement unified array coder for flexible length handling
  and add related tests
- feat(binstruct): add computedRef function for dynamic reference calculations
  in encoding/decoding
- refactor(binstruct): enhance formatting and type safety in computedRef
  function and related tests
- chore(binstruct): remove unused import of u16le from ref.ts for cleaner code

### 2025.08.06

#### @hertzg/binstruct 0.1.3 (patch)

- feat(binstruct): improve context handling in coders and update imports for
  consistency

### 2025.08.06

#### @hertzg/binstruct 0.1.2 (patch)

- feat(binstruct): add support for bytes and enhance module documentation
- fix(binstruct): improve bytes encoding/decoding logic to handle fixed and
  variable lengths correctly
- fix(binstruct): update type definitions for improved type safety in array and
  mod modules
- fix(binstruct): update coders to use function calls for numeric types
- refactor(binstruct): enhance array and bytes coders with context support and
  add new fixed-length string coder
- refactor(binstruct): rename arrayOf to arrayLP and make numeric aliases
  functions
- chore(binstruct): enhanced encoding/decoding examples
- chore(binstruct): remove unused import of RefValue from ref.ts

### 2025.07.29

#### @hertzg/binseek 0.2.2 (patch)

- chore(binseek): update version to 0.2.1 in import map and deno.json

#### @hertzg/binstruct 0.1.1 (patch)

- fix(binstruct): update import paths and enhance module documentation

### 2025.07.28

#### @hertzg/binseek 0.2.0 (minor)

- feat(binseek): include numeric.ts
- feat(binseek)!: get rid of bitarray and rename .bytes() to .build()
- feat(binseek): better type support
- chore(binseek): rename parameter in get method for clarity
- chore(binseek): improve type definitions for get method
- chore(binseek): change import to type for ValueWithByteLength
- chore(binseek): type support
- chore(binseek): refactor code a bit

#### @hertzg/binstruct 0.1.0 (minor)

- feat(binstruct): introduce binstruct

### 2025.03.11

#### @hertzg/binseek 0.1.1 (patch)

- chore(binseek): format
- chore(binseek): test overflow cases

### 2025.03.11

#### @hertzg/binseek 0.1.0 (minor)

- feat(binseek)!: shrink the module
- fix(binseek): fix packaging

### 2025.03.10

#### @hertzg/binseek 0.0.4 (patch)

- feat(binseek): improvements for the BinaryView

### 2025.03.10

#### @hertzg/binseek 0.0.3 (patch)

- feat(binseek): implement BinaryView

### 2025.03.09

#### @hertzg/binseek 0.0.2 (patch)

- fix(binseek): relative imports in code

### 2025.03.09

#### @hertzg/binseek 0.0.1 (patch)

- feat(binseek): initial release
- chore(binseek): format

### 2025.01.27

#### @hertzg/bx 3.0.1 (major)

- feat(bx): import bx package
- chore(bx,mymagti-api): add to import_map.json
- chore(bx): fix module graph was expcluded error
- chore(mymagti-api,bx): add to labeler

#### @hertzg/mymagti-api 0.0.4 (patch)

- feat(mymagti-api): import mymagti-api project
- chore(bx,mymagti-api): add to import_map.json
- chore(mymagti-api,bx): add to labeler
- chore(mymagti-api): deno fmt

### 2025.01.27

#### @hertzg/wg-conf 0.1.7 (patch)

- chore(*): remove submodules from importMap

#### @hertzg/wg-ini 0.1.7 (patch)

- fix(wg-ini): use relative import within the same module
- chore(wg-ini): deno fmt
- chore(wg-ini): remove dead links from docs

#### @hertzg/wg-keys 0.1.7 (patch)

- chore(*): remove submodules from importMap

### 2025.01.27

#### @hertzg/wg-conf 0.1.5 (patch)

- chore(wg-conf): improve the examples

### 2025.01.26

#### @hertzg/wg-conf 0.1.4 (patch)

- feat(*): manual version bump

#### @hertzg/wg-ini 0.1.4 (patch)

- feat(*): manual version bump

#### @hertzg/wg-keys 0.1.4 (patch)

- feat(*): manual version bump

### 2025.01.26

#### @hertzg/wg-conf 0.1.2 (minor)

- feat(wg-conf,wg-ini,wg-keys): rename folders to match the name
- feat(wg-conf): wg-quick config parser and serializer
- fix(wg-conf,wg-ini): fix wrong imports

#### @hertzg/wg-ini 0.1.2 (minor)

- BREAKING(wg-ini)!: rewrite to use streams
- feat(wg-conf,wg-ini,wg-keys): rename folders to match the name
- fix(wg-conf,wg-ini): fix wrong imports
- chore(wg-ini): ser version manually to 0.1.0

#### @hertzg/wg-keys 0.1.2 (patch)

- feat(wg-conf,wg-ini,wg-keys): rename folders to match the name

### 2025.01.25

#### @hertzg/wg-ini 0.1.2 (minor)

- chore(wg-ini): ser version manually to 0.1.0

#### @hertzg/wg-keys 0.1.2 (patch)

- chore(*): force release
- chore(*): format deno.json
- chore(*): update lockfile
- chore(*): exclude ignored paths
- chore(*): deno fmt
- chore(*): update lockfiles

### 2025.01.25

#### @hertzg/wg-ini 0.1.1 (patch)

- chore(*): force release

#### @hertzg/wg-keys 0.1.2 (patch)

- chore(*): force release

### 2025.01.25

#### @hertzg/wg-ini 0.1.0 (minor)

- chore(wg-ini): ser version manually to 0.1.0

#### @hertzg/wg-keys 0.1.1 (patch)

- chore(*): format deno.json
- chore(*): update lockfile
- chore(*): exclude ignored paths
- chore(*): deno fmt
- chore(*): update lockfiles
