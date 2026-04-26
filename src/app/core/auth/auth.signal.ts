import { computed, signal } from '@angular/core';
import { AuthState } from '../../shared/types';

// Estado global de autenticação — armazenado apenas em memória (Signal)
// JWT nunca vai para localStorage
export const authState = signal<AuthState>({
  user: null,
  token: null,
  isAuthenticated: false,
});

export const currentUser = computed(() => authState().user);
export const isAuthenticated = computed(() => authState().isAuthenticated);
export const userPerfil = computed(() => authState().user?.perfil ?? null);

export function setAuth(token: string, user: AuthState['user']): void {
  authState.set({ token, user, isAuthenticated: true });
}

export function clearAuth(): void {
  authState.set({ token: null, user: null, isAuthenticated: false });
}
