
// This file is now deprecated and will be removed in a future update.
// All data persistence is handled by Dexie via src/lib/db.ts.

export function loadState<T>(key: string): T | undefined {
  console.warn("loadState from localStorage is deprecated. Using Dexie now.");
  return undefined;
}

export function saveState<T>(key: string, state: T): void {
  console.warn("saveState to localStorage is deprecated. Using Dexie now.");
}
