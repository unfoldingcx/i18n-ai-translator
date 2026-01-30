import type { FlattenedStrings } from "./types";

export function flatten(
  obj: Record<string, unknown>,
  prefix = ""
): FlattenedStrings {
  const result: FlattenedStrings = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}
