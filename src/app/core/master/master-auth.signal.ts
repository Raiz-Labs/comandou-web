import { computed, signal } from '@angular/core';

export interface MasterUser {
  id: string;
  email: string;
}

export interface ImpersonationInfo {
  tenantId: string;
  tenantNome: string;
}

interface MasterAuthState {
  token: string | null;
  master: MasterUser | null;
  impersonating: ImpersonationInfo | null;
}

export const masterAuthState = signal<MasterAuthState>({
  token: null,
  master: null,
  impersonating: null,
});

export const isMasterAuthenticated = computed(() => !!masterAuthState().token);
export const masterImpersonating = computed(() => masterAuthState().impersonating);

export function setMasterAuth(token: string, master: MasterUser): void {
  masterAuthState.update(s => ({ ...s, token, master }));
}

export function setImpersonating(info: ImpersonationInfo): void {
  masterAuthState.update(s => ({ ...s, impersonating: info }));
}

export function clearImpersonating(): void {
  masterAuthState.update(s => ({ ...s, impersonating: null }));
}

export function clearMasterAuth(): void {
  masterAuthState.set({ token: null, master: null, impersonating: null });
}
