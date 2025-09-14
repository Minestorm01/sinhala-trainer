export function getItem<T>(k: string): T | null {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : null; } catch { return null; }
}
export function setItem(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}
