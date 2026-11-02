export function readStoredArray<T>(key: string, isItem: (value: unknown) => value is T, label: string): T[] {
  const stored = window.localStorage.getItem(key);
  if (stored === null) return [];

  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    throw new Error(`Saved ${label} in this browser could not be read.`);
  }

  if (!Array.isArray(value) || !value.every(isItem)) {
    throw new Error(`Saved ${label} in this browser has an invalid format.`);
  }
  return value;
}

export function writeStoredArray<T>(key: string, value: T[]): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function createLocalId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
