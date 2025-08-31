export function assertNever(_t: never, message = "Assertion error"): never {
  throw new Error(message);
}
