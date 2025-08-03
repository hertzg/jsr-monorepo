import type { Coder, Context } from "./mod.ts";

const kRefSymbol = Symbol("ref");

export type LengthType = number | RefValue<number>;

export function isValidLength(length: number): boolean {
  return Number.isInteger(length) && length >= 0;
}

export function tryUnrefLength(
  length: LengthType | undefined | null,
  ctx: Context | undefined | null,
): number | undefined {
  if (length == null || ctx == null) {
    return undefined;
  }

  return isRef<number>(length) ? length(ctx) : length;
}

export type RefValue<TDecoded> = {
  (ctx: Context): TDecoded;
  [kRefSymbol]: true;
};

export function ref<TDecoded>(coder: Coder<TDecoded>): RefValue<TDecoded> {
  const unref: RefValue<TDecoded> = (ctx: Context) => {
    if (!ctx.refs.has(coder)) {
      throw new Error("Ref not found");
    }

    return ctx.refs.get(coder)!;
  };

  unref[kRefSymbol] = true;
  return unref;
}

export function isRef<T>(value: unknown): value is RefValue<T> {
  return typeof value === "function" && kRefSymbol in value;
}
