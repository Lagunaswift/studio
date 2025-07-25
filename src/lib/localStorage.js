// This file is now deprecated and will be removed in a future update.
// All data persistence is handled by Dexie via src/lib/db.ts.
export function loadState(key) {
    console.warn("loadState from localStorage is deprecated. Using Dexie now.");
    return undefined;
}
export function saveState(key, state) {
    console.warn("saveState to localStorage is deprecated. Using Dexie now.");
}
