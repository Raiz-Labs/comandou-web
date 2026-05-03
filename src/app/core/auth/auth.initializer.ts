import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export function authInitializer(): () => Promise<void> {
  const authService = inject(AuthService);
  return async () => {
    try {
      await authService.refresh();
    } catch {
      // Cookie ausente ou expirado — guard redireciona para /login normalmente
    }
  };
}
