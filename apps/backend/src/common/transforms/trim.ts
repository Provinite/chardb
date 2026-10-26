import { Transform } from "class-transformer";

/**
 * Trims surrounding whitespace from a string field before validation, so a
 * whitespace-only value fails `@MinLength(1)` / `@IsNotEmpty()` rather than
 * being stored. Inner spacing is left as typed. Non-strings pass through for
 * the field's own validators to reject.
 *
 * Runs because the global ValidationPipe has `transform: true`.
 */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  );
