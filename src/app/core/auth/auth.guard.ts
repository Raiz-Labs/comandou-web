import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isAuthenticated, userPerfil } from './auth.signal';
import { Perfil } from '../../shared/types';

// Guard geral — bloqueia rotas sem autenticação
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};

// Guard de perfil — permite apenas perfis especificados
export function perfilGuard(perfis: Perfil[]): CanActivateFn {
  return () => {
    const router = inject(Router);
    if (!isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    const perfil = userPerfil();
    if (!perfil || !perfis.includes(perfil)) {
      return router.createUrlTree(['/login']);
    }
    return true;
  };
}

// Guard público — redireciona usuário logado para sua rota de perfil
export const publicGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!isAuthenticated()) {
    return true;
  }
  const PERFIL_ROUTES: Record<Perfil, string> = {
    garcom: '/garcom/mesas',
    cozinha: '/cozinha/fila',
    caixa: '/caixa/comandas',
    admin: '/admin/dashboard',
  };
  const perfil = userPerfil();
  const destino = perfil ? (PERFIL_ROUTES[perfil] ?? '/login') : '/login';
  return router.createUrlTree([destino]);
};
