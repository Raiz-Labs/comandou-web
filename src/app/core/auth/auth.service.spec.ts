import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authState, clearAuth } from './auth.signal';
import { environment } from '../../../environments/environment';
import { Usuario } from '../../shared/types';

const usuario: Usuario = { id: '1', nome: 'Ana', email: 'ana@test.com', perfil: 'admin', ativo: true };

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: Router, useValue: router }],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearAuth();
    TestBed.resetTestingModule();
  });

  it('login: guarda token/usuário no authState e navega pra rota do perfil', async () => {
    const promise = service.login({ email: 'ana@test.com', senha: '123456' });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accessToken: 'token-1', user: usuario });

    await promise;
    expect(authState().token).toBe('token-1');
    expect(authState().isAuthenticated).toBe(true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('refresh: atualiza authState com o novo token e retorna o token', async () => {
    const promise = service.refresh();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accessToken: 'token-novo', user: usuario });

    const token = await promise;
    expect(token).toBe('token-novo');
    expect(authState().token).toBe('token-novo');
  });

  it('refresh: propaga o erro quando o servidor recusa (token expirado)', async () => {
    const promise = service.refresh();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(promise).rejects.toBeTruthy();
  });

  it('logout: limpa authState e navega pra /login mesmo se a chamada falhar', async () => {
    const promise = service.logout();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    req.flush({}, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeTruthy();
    expect(authState().isAuthenticated).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
