import { useState } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = (next: T) => {
    setValue(next);
    try {
      if (next === null || next === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // storage quota exceeded or private mode — ignore
    }
  };

  const remove = () => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    setValue(initial);
  };

  return [value, set, remove] as const;
}
