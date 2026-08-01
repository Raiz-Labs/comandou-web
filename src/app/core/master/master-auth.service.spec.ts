import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { MasterAuthService } from './master-auth.service';
import { authState, clearAuth, setAuth } from '../auth/auth.signal';
import { clearMasterAuth, masterAuthState, setMasterAuth } from './master-auth.signal';
import { environment } from '../../../environments/environment';
import { Usuario } from '../../shared/types';

const usuario: Usuario = { id: '1', nome: 'Ana', email: 'ana@test.com', perfil: 'admin', ativo: true };

describe('MasterAuthService', () => {
  let service: MasterAuthService;
  let httpMock: HttpTestingController;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MasterAuthService, { provide: Router, useValue: router }],
    });
    service = TestBed.inject(MasterAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearAuth();
    clearMasterAuth();
    TestBed.resetTestingModule();
  });

  it('login: guarda o token master e navega pra /master/tenants', async () => {
    const promise = service.login('master@test.com', '123456');

    const req = httpMock.expectOne(`${environment.apiUrl}/master/auth/login`);
    req.flush({ token: 'master-token', master: { id: 'm1', email: 'master@test.com' } });

    await promise;
    expect(masterAuthState().token).toBe('master-token');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/master/tenants');
  });

  it('logout: limpa tanto o auth principal quanto o master, mesmo com sessão de tenant ativa (impersonate)', async () => {
    setAuth('token-usuario', usuario);
    setMasterAuth('master-token', { id: 'm1', email: 'master@test.com' });

    await service.logout();

    expect(masterAuthState().token).toBeNull();
    expect(masterAuthState().master).toBeNull();
    expect(masterAuthState().impersonating).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/master/login');
  });

  it('impersonateTenant: seta auth do usuário impersonado sem afetar a sessão master', async () => {
    setMasterAuth('master-token', { id: 'm1', email: 'master@test.com' });

    const promise = service.impersonateTenant('tenant-1', 'Restaurante X');

    const req = httpMock.expectOne((r) => r.url.includes('/master/tenants/tenant-1/impersonate'));
    req.flush({ accessToken: 'token-tenant', user: usuario });

    await promise;
    expect(masterAuthState().token).toBe('master-token');
    expect(masterAuthState().impersonating).toEqual({ tenantId: 'tenant-1', tenantNome: 'Restaurante X' });
  });

  it('exitImpersonation: limpa o auth do tenant e a flag de impersonating, preservando a sessão master', () => {
    setMasterAuth('master-token', { id: 'm1', email: 'master@test.com' });
    setAuth('token-tenant', usuario);

    service.exitImpersonation();

    expect(masterAuthState().token).toBe('master-token');
    expect(masterAuthState().impersonating).toBeNull();
    expect(authState().isAuthenticated).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/master/tenants');
  });
});
