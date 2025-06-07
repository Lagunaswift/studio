export function loadState<T>(key: string): T | undefined {
  try {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const serializedState = localStorage.getItem(key);
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState) as T;
  } catch (error) {
    console.warn(`Error loading state for key "${key}" from localStorage:`, error);
    return undefined;
  }
}

export function saveState<T>(key: string, state: T): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    const serializedState = JSON.stringify(state);
    localStorage.setItem(key, serializedState);
  } catch (error) {
    console.warn(`Error saving state for key "${key}" to localStorage:`, error);
  }
}
