import type { FlattenedStrings, GroupedStrings } from "./types";

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

export function unflatten(flat: FlattenedStrings): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]!] = value;
  }

  return result;
}

export function groupBySection(flat: FlattenedStrings): GroupedStrings {
  const result: GroupedStrings = {};

  for (const [key, value] of Object.entries(flat)) {
    const dotIndex = key.indexOf(".");
    let section: string;
    let remainder: string;

    if (dotIndex === -1) {
      section = key;
      remainder = "";
    } else {
      section = key.slice(0, dotIndex);
      remainder = key.slice(dotIndex + 1);
    }

    if (!result[section]) {
      result[section] = {};
    }

    result[section]![remainder] = value;
  }

  return result;
}
