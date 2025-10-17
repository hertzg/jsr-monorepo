import { assertEquals, assertThrows } from "@std/assert";
import { autoGrowBuffer, type AutogrowOptions } from "./buffer.ts";

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
  let callCount = 0;
  const requiredSize = 20000;

  const result = autoGrowBuffer((buffer) => {
    callCount++;
    if (buffer.length < requiredSize) {
      throw new RangeError("Buffer too small");
    }
    return `success after ${callCount} attempts`;
  });

  assertEquals(result, "success after 4 attempts");
  assertEquals(callCount, 4);
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

Deno.test("AutogrowOptions interface", () => {
  const options: AutogrowOptions = {
    initialSize: 1024,
    maxByteLength: 1024 * 1024,
    growthFactor: 1.5,
  };

  assertEquals(options.initialSize, 1024);
  assertEquals(options.maxByteLength, 1024 * 1024);
  assertEquals(options.growthFactor, 1.5);
});

Deno.test("autoGrowBuffer - growth factor validation", () => {
  // Test growth factor = 1 (should be rejected)
  assertThrows(
    () => {
      autoGrowBuffer(
        (_buffer) => "success",
        {
          growthFactor: 1,
        },
      );
    },
    Error,
    "Growth factor must be greater than 1",
  );

  // Test growth factor < 1 (should be rejected)
  assertThrows(
    () => {
      autoGrowBuffer(
        (_buffer) => "success",
        {
          growthFactor: 0.5,
        },
      );
    },
    Error,
    "Growth factor must be greater than 1",
  );

  // Test growth factor = 0 (should be rejected)
  assertThrows(
    () => {
      autoGrowBuffer(
        (_buffer) => "success",
        {
          growthFactor: 0,
        },
      );
    },
    Error,
    "Growth factor must be greater than 1",
  );

  // Test growth factor < 0 (should be rejected)
  assertThrows(
    () => {
      autoGrowBuffer(
        (_buffer) => "success",
        {
          growthFactor: -1,
        },
      );
    },
    Error,
    "Growth factor must be greater than 1",
  );
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
  let attemptCount = 0;
  const result = autoGrowBuffer(
    (buffer) => {
      attemptCount++;
      if (buffer.length < 5) {
        throw new RangeError("Buffer too small");
      }
      return `success after ${attemptCount} attempts`;
    },
    {
      initialSize: 1,
      growthFactor: 1.01, // Very small growth factor
    },
  );

  assertEquals(result, "success after 5 attempts");
  assertEquals(attemptCount, 5);
});

Deno.test("autoGrowBuffer - integer truncation safety", () => {
  // Test that truncation doesn't cause infinite loops
  let attemptCount = 0;
  const result = autoGrowBuffer(
    (buffer) => {
      attemptCount++;
      if (buffer.length < 3) {
        throw new RangeError("Buffer too small");
      }
      return `success after ${attemptCount} attempts`;
    },
    {
      initialSize: 1,
      growthFactor: 1.5, // This will truncate to same size initially
    },
  );

  assertEquals(result, "success after 3 attempts");
  assertEquals(attemptCount, 3);
});

Deno.test("autoGrowBuffer - robustness with edge case configurations", () => {
  // Test multiple edge cases that could cause infinite loops
  const testCases = [
    { initialSize: 1, growthFactor: 1.001 },
    { initialSize: 2, growthFactor: 1.1 },
    { initialSize: 3, growthFactor: 1.2 },
  ];

  for (const config of testCases) {
    let attemptCount = 0;
    const result = autoGrowBuffer(
      (buffer) => {
        attemptCount++;
        if (buffer.length < 10) {
          throw new RangeError("Buffer too small");
        }
        return `success with ${config.growthFactor} growth factor`;
      },
      config,
    );

    assertEquals(result, `success with ${config.growthFactor} growth factor`);
    // Ensure it doesn't take too many attempts (indicating no infinite loop)
    assertEquals(attemptCount <= 10, true);
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
