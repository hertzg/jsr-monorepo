import type { Coder, Context } from "./mod.ts";

const kRefSymbol = Symbol("ref");

export type LengthType = number | RefValue<number>;

export function isValidLength(length: number): boolean {
  return Number.isInteger(length) && length >= 0;
}

export function tryUnrefLength(
  length: LengthType | undefined | null,
  ctx: Context | undefined | null,
): number | undefined | null {
  if (ctx != null) {
    return isRef<number>(length) ? length(ctx) : length;
  }

  return length as number | undefined | null;
}

export type RefValue<TDecoded> = {
  (ctx: Context): TDecoded;
  [kRefSymbol]: true;
};

export function ref<TDecoded>(coder: Coder<TDecoded>): RefValue<TDecoded> {
  const unref: RefValue<TDecoded> = (ctx: Context) => {
    if (!ctx.refs.has(coder as Coder<unknown>)) {
      throw new Error("Ref not found");
    }

    return ctx.refs.get(coder as Coder<unknown>)! as TDecoded;
  };

  unref[kRefSymbol] = true;
  return unref;
}

export function isRef<T>(value: unknown): value is RefValue<T> {
  return typeof value === "function" && kRefSymbol in value;
}
