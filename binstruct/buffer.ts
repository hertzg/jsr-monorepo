/**
 * Buffer management utilities for automatic buffer growth during encoding operations.
 *
 * This module provides utilities for managing buffer allocation and growth when
 * encoding data of unknown or variable size. The primary function `autoGrowBuffer`
 * automatically resizes buffers as needed during encoding operations, preventing
 * buffer overflow errors while maintaining efficient memory usage.
 *
 * ## Key Features
 *
 * - **Automatic Growth**: Buffers grow automatically when encoding operations
 *   require more space than initially allocated
 * - **Intelligent Resizing**: Uses configurable growth factors and respects
 *   maximum size limits to prevent excessive memory usage
 * - **Error Handling**: Provides clear error messages when growth limits are
 *   reached or invalid configurations are provided
 * - **Type Safety**: Full TypeScript support with generic return types
 * - **Performance**: Efficient exponential growth strategy minimizes resize
 *   operations
 *
 * ## Usage Patterns
 *
 * The `autoGrowBuffer` function is designed to work with any encoding function
 * that may require variable buffer sizes. Common use cases include:
 *
 * - Encoding data structures with variable-length fields
 * - Processing streams of unknown size
 * - Building binary formats with dynamic content
 * - Handling user-provided data of unpredictable size
 *
 * ## Configuration
 *
 * Buffer growth behavior can be customized through the `AutogrowOptions`
 * interface:
 *
 * - `initialSize`: Starting buffer size (default: 4KB)
 * - `maxByteLength`: Maximum allowed buffer size (default: 400MB)
 * - `growthFactor`: Multiplier for each resize operation (default: 2x)
 *
 * ## Error Handling
 *
 * The module provides clear error messages for common failure scenarios:
 *
 * - Invalid initial size or growth factor configuration
 * - Buffer growth reaching maximum size limits
 * - Non-RangeError exceptions are propagated unchanged
 *
 * @module
 */

/**
 * Configuration options for automatic buffer growth.
 *
 * These options control how the `autoGrowBuffer` function manages buffer
 * resizing when encoding operations require more space than initially available.
 *
 * @interface AutogrowOptions
 */
export interface AutogrowOptions {
  /**
   * Initial buffer size in bytes. Must be greater than 0 and less than or equal to maxByteLength.
   * Defaults to 4096 bytes (4KB).
   */
  initialSize?: number;
  /**
   * Maximum buffer size in bytes. The buffer will not grow beyond this limit.
   * When reached, a RangeError will be thrown. Defaults to 400MB.
   */
  maxByteLength?: number;
  /**
   * Growth factor multiplier for buffer resizing. Must be greater than 1.
   * Each resize multiplies the current size by this factor. Defaults to 2 (doubling).
   */
  growthFactor?: number;
}

/**
 * Automatically grows a buffer until the encoding function succeeds.
 *
 * This function creates a buffer and repeatedly calls the provided encoding
 * function, automatically resizing the buffer if a RangeError is thrown due
 * to insufficient space. The buffer grows exponentially by the configured
 * growth factor until either the encoding succeeds or the maximum buffer size
 * is reached.
 *
 * The function intelligently handles buffer growth by:
 * - Respecting the maximum buffer size limit to prevent excessive memory usage
 * - Using integer truncation to ensure valid buffer sizes
 * - Providing clear error messages when growth limits are reached
 * - Propagating non-RangeError exceptions without modification
 *
 * @template T The return type of the encoding function
 * @param tryEncodeFn Function that attempts to encode data into the provided buffer
 * @param autogrowOptions Configuration options for buffer growth behavior
 * @returns The result of the successful encoding operation
 * @throws {RangeError} When buffer growth reaches the maximum size limit
 * @throws {Error} When initial size is invalid or growth factor is less than 1
 *
 * @example Basic usage with automatic buffer growth
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { autoGrowBuffer } from "@hertzg/binstruct";
 *
 * const data = new Uint8Array(10000); // Large data
 * const result = autoGrowBuffer((buffer) => {
 *   // Simulate encoding that requires more space than initially provided
 *   if (buffer.length < data.length) {
 *     throw new RangeError("Buffer too small");
 *   }
 *   buffer.set(data);
 *   return data.length; // Return bytes written
 * });
 *
 * assertEquals(result, 10000);
 * ```
 *
 * @example Custom buffer growth configuration
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { autoGrowBuffer } from "@hertzg/binstruct";
 *
 * const result = autoGrowBuffer(
 *   (buffer) => {
 *     if (buffer.length < 1000) {
 *       throw new RangeError("Buffer too small");
 *     }
 *     return "encoded";
 *   },
 *   {
 *     initialSize: 100,
 *     maxByteLength: 2000,
 *     growthFactor: 1.5,
 *   }
 * );
 *
 * assertEquals(result, "encoded");
 * ```
 *
 * @example Error handling and maximum size limits
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { autoGrowBuffer } from "@hertzg/binstruct";
 *
 * // Throws when maximum buffer size is reached
 * assertThrows(() => {
 *   autoGrowBuffer(
 *     (_buffer) => {
 *       throw new RangeError("Always too small");
 *     },
 *     {
 *       initialSize: 100,
 *       maxByteLength: 500, // Very small limit
 *     }
 *   );
 * }, RangeError, "autoGrowBuffer: Unable to further grow buffer, byteLength is already at maxByteLength");
 * ```
 *
 * @example Error propagation for non-RangeError exceptions
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { autoGrowBuffer } from "@hertzg/binstruct";
 *
 * assertThrows(() => {
 *   autoGrowBuffer(() => {
 *     throw new Error("Custom error");
 *   });
 * }, Error, "Custom error");
 * ```
 */
export function autoGrowBuffer<T>(
  tryEncodeFn: (buffer: Uint8Array) => T,
  autogrowOptions: AutogrowOptions = {},
): T {
  const {
    initialSize = 4096,
    maxByteLength = 1024 * 1024 * 400, // 400MB
    growthFactor = 2,
  } = autogrowOptions;

  if (initialSize < 0) {
    throw new Error("Initial size must be greater than 0");
  } else if (initialSize > maxByteLength) {
    throw new Error(
      "Initial size must be less than or equal to maximum byte length",
    );
  } else if (growthFactor < 1) {
    throw new Error("Growth factor must be greater than 1");
  }

  const buffer = new Uint8Array(
    new ArrayBuffer(initialSize, {
      maxByteLength,
    }),
  );

  while (true) {
    try {
      return tryEncodeFn(buffer);
    } catch (e) {
      if (e instanceof RangeError) {
        if (buffer.buffer.byteLength >= buffer.buffer.maxByteLength) {
          throw new RangeError(
            "autoGrowBuffer: Unable to further grow buffer, byteLength is already at maxByteLength",
          );
        }

        buffer.buffer.resize(
          Math.min(
            maxByteLength,
            Math.trunc(buffer.buffer.byteLength * growthFactor),
          ),
        );
        continue;
      }
      throw e;
    }
  }
}
