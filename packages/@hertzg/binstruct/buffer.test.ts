import { assertEquals, assertLessOrEqual, assertThrows } from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { autoGrowBuffer } from "./buffer.ts";

Deno.test("autoGrowBuffer - basic functionality", () => {
  const data = new Uint8Array(10000);
  data.fill(42);

  const result = autoGrowBuffer((buffer) => {
    if (buffer.length < data.length) {
      throw new RangeError("Buffer too small");
    }
    buffer.set(data);
    return data.length;
  });

  assertEquals(result, 10000);
});

Deno.test("autoGrowBuffer - no growth needed", () => {
  const result = autoGrowBuffer((_buffer) => {
    // Should fit in default initial size (4096)
    return "success";
  });

  assertEquals(result, "success");
});

Deno.test("autoGrowBuffer - custom configuration", () => {
  const result = autoGrowBuffer(
    (buffer) => {
      if (buffer.length < 1000) {
        throw new RangeError("Buffer too small");
      }
      return "encoded";
    },
    {
      initialSize: 100,
      maxByteLength: 2000,
      growthFactor: 1.5,
    },
  );

  assertEquals(result, "encoded");
});

Deno.test("autoGrowBuffer - error propagation", () => {
  assertThrows(
    () => {
      autoGrowBuffer(() => {
        throw new Error("Custom error");
      });
    },
    Error,
    "Custom error",
  );
});

Deno.test("autoGrowBuffer - data integrity", () => {
  const originalData = new Uint8Array(5000);
  for (let i = 0; i < originalData.length; i++) {
    originalData[i] = i % 256;
  }

  const result = autoGrowBuffer((buffer) => {
    if (buffer.length < originalData.length) {
      throw new RangeError("Buffer too small");
    }
    buffer.set(originalData);
    return buffer.slice(0, originalData.length);
  });

  assertEquals(result.length, originalData.length);
  assertEquals(result, originalData);
});

Deno.test("autoGrowBuffer - growth behavior", () => {
  const requiredSize = 20000;

  const fill = spy((buffer: Uint8Array) => {
    if (buffer.length < requiredSize) {
      throw new RangeError("Buffer too small");
    }
    return "encoded";
  });

  assertEquals(autoGrowBuffer(fill), "encoded");
  assertSpyCalls(fill, 4);
});

Deno.test("autoGrowBuffer - invalid configuration", () => {
  assertThrows(
    () => {
      autoGrowBuffer(
        (_buffer) => {
          throw new RangeError("Always too small");
        },
        {
          initialSize: 100,
          maxByteLength: 500,
        },
      );
    },
    RangeError,
    "autoGrowBuffer: Unable to further grow buffer, byteLength is already at maxByteLength",
  );
});

Deno.test("autoGrowBuffer - return type flexibility", () => {
  const stringResult = autoGrowBuffer(() => "hello");
  assertEquals(stringResult, "hello");

  const numberResult = autoGrowBuffer(() => 42);
  assertEquals(numberResult, 42);

  const objectResult = autoGrowBuffer(() => ({ success: true }));
  assertEquals(objectResult, { success: true });
});

Deno.test("autoGrowBuffer - growth factor validation", () => {
  // Anything at or below 1 fails to grow the buffer, so it is rejected up front
  // rather than looping forever.
  const rejected = [1, 0.5, 0, -1];

  for (const growthFactor of rejected) {
    assertThrows(
      () => autoGrowBuffer((_buffer) => "success", { growthFactor }),
      Error,
      "Growth factor must be greater than 1",
    );
  }
});

Deno.test("autoGrowBuffer - minimum growth guarantee", () => {
  // Test with very small growth factor that would result in no growth due to truncation
  const result = autoGrowBuffer(
    (buffer) => {
      if (buffer.length < 10) {
        throw new RangeError("Buffer too small");
      }
      return "success";
    },
    {
      initialSize: 1,
      growthFactor: 1.1, // Very small growth factor
    },
  );

  assertEquals(result, "success");
});

Deno.test("autoGrowBuffer - small growth factor edge case", () => {
  // Test with growth factor that would result in same size due to truncation
  // This tests the Math.max fix that ensures at least 1 byte growth
  const fill = spy((buffer: Uint8Array) => {
    if (buffer.length < 5) {
      throw new RangeError("Buffer too small");
    }
    return "encoded";
  });

  const result = autoGrowBuffer(fill, {
    initialSize: 1,
    growthFactor: 1.01, // Very small growth factor
  });

  assertEquals(result, "encoded");
  assertSpyCalls(fill, 5);
});

Deno.test("autoGrowBuffer - integer truncation safety", () => {
  // Test that truncation doesn't cause infinite loops
  const fill = spy((buffer: Uint8Array) => {
    if (buffer.length < 3) {
      throw new RangeError("Buffer too small");
    }
    return "encoded";
  });

  const result = autoGrowBuffer(fill, {
    initialSize: 1,
    growthFactor: 1.5, // This will truncate to same size initially
  });

  assertEquals(result, "encoded");
  assertSpyCalls(fill, 3);
});

Deno.test("autoGrowBuffer - robustness with edge case configurations", () => {
  // Test multiple edge cases that could cause infinite loops
  const testCases = [
    { initialSize: 1, growthFactor: 1.001 },
    { initialSize: 2, growthFactor: 1.1 },
    { initialSize: 3, growthFactor: 1.2 },
  ];

  for (const config of testCases) {
    const fill = spy((buffer: Uint8Array) => {
      if (buffer.length < 10) {
        throw new RangeError("Buffer too small");
      }
      return "encoded";
    });

    assertEquals(autoGrowBuffer(fill, config), "encoded");
    // Ensure it doesn't take too many attempts (indicating no infinite loop)
    assertLessOrEqual(fill.calls.length, 10);
  }
});

Deno.test("autoGrowBuffer - initial size validation", () => {
  // Test negative initial size
  assertThrows(
    () => {
      autoGrowBuffer(
        (_buffer) => "success",
        {
          initialSize: -1,
        },
      );
    },
    Error,
    "Initial size must be non-negative",
  );

  // Test initial size = 0 (should be valid)
  const resultZero = autoGrowBuffer(
    (buffer) => {
      if (buffer.length < 5) {
        throw new RangeError("Buffer too small");
      }
      return "success with zero initial size";
    },
    {
      initialSize: 0,
    },
  );
  assertEquals(resultZero, "success with zero initial size");

  // Test initial size > maxByteLength
  assertThrows(
    () => {
      autoGrowBuffer(
        (_buffer) => "success",
        {
          initialSize: 1000,
          maxByteLength: 500,
        },
      );
    },
    Error,
    "Initial size must be less than or equal to maximum byte length",
  );
});
