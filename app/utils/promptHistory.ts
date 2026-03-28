const STORAGE_KEY = 'landscaping_prompt_history';
const MAX_HISTORY = 20;

export function getPromptHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePrompt(prompt: string): void {
  if (typeof window === 'undefined' || !prompt.trim()) return;
  try {
    let history = getPromptHistory();
    history = history.filter(p => p !== prompt.trim());
    history.unshift(prompt.trim());
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage may be full or disabled
  }
}
