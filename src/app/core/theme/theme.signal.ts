import { signal } from '@angular/core';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'comandou-theme';

// Estado global de tema — o atributo data-theme já foi aplicado no <html>
// por um script inline em index.html antes do primeiro paint; aqui só espelhamos.
export const theme = signal<Theme>(
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
);

export function toggleTheme(): void {
  const next: Theme = theme() === 'dark' ? 'light' : 'dark';
  theme.set(next);

  if (next === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  localStorage.setItem(STORAGE_KEY, next);
}
