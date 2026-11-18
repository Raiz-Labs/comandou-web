import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';

// ponytail: teto de espera no boot; um Retry-After maior (a janela da API é 1 min)
// cai no /login como antes, em vez de prender a tela em branco.
const ESPERA_MAXIMA_MS = 5000;

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function authInitializer(): () => Promise<void> {
  const authService = inject(AuthService);
  return async () => {
    try {
      await authService.refresh();
    } catch (err) {
      // Cookie ausente ou expirado — guard redireciona para /login normalmente
      if (!(err instanceof HttpErrorResponse) || err.status !== 429) return;

      // 429: muitas abas/aparelhos abrindo pelo mesmo IP. A sessão é válida —
      // espera o Retry-After e tenta uma vez antes de desistir.
      const segundos = Number(err.headers.get('Retry-After')) || 1;
      await esperar(Math.min(segundos * 1000, ESPERA_MAXIMA_MS));
      await authService.refresh().catch(() => undefined);
    }
  };
}
