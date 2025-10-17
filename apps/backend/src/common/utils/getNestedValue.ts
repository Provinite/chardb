/**
 * Extracts a value from an object using a dot-notation path.
 *
 * @param obj - The object to extract from
 * @param path - Dot-notation path (e.g., 'input.speciesId' or 'id')
 * @returns The value at the path, or undefined if not found
 *
 * @example
 * ```typescript
 * const args = { id: '123', input: { name: 'foo', speciesId: '456' } };
 * getNestedValue(args, 'id');              // '123'
 * getNestedValue(args, 'input.speciesId'); // '456'
 * getNestedValue(args, 'input.missing');   // undefined
 * ```
 */
export function getNestedValue(obj: any, path: string): any {
  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (!current) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}
