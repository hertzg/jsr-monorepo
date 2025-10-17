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
