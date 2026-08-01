import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { authState, clearAuth, setAuth } from './auth.signal';
import { clearMasterAuth, masterAuthState, setMasterAuth } from '../master/master-auth.signal';
import { environment } from '../../../environments/environment';
import { Usuario } from '../../shared/types';

const usuario: Usuario = { id: '1', nome: 'Ana', email: 'ana@test.com', perfil: 'admin', ativo: true };

// AuthService.refresh() usa async/await por baixo — dá alguns ticks pra
// deixar a chain de promises (firstValueFrom → finally → switchMap) avançar
// antes de checar a próxima requisição HTTP esperada.
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearAuth();
    clearMasterAuth();
    TestBed.resetTestingModule();
  });

  it('401 → refresh com sucesso → requisição original refeita com o novo token', async () => {
    setAuth('token-velho', usuario);

    const promise = new Promise<unknown>((resolve, reject) => {
      http.get(`${environment.apiUrl}/produtos`).subscribe({ next: resolve, error: reject });
    });

    httpMock
      .expectOne((r) => r.url.includes('/produtos'))
      .flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne((r) => r.url.includes('/auth/refresh'))
      .flush({ accessToken: 'token-novo', user: usuario });
    await flushPromises();

    const retryReq = httpMock.expectOne((r) => r.url.includes('/produtos'));
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer token-novo');
    retryReq.flush([]);

    await promise;
    expect(authState().token).toBe('token-novo');
  });

  it('refresh também retorna 401 → limpa auth e redireciona para /login', async () => {
    setAuth('token-velho', usuario);

    const promise = new Promise<unknown>((resolve, reject) => {
      http.get(`${environment.apiUrl}/produtos`).subscribe({ next: resolve, error: reject });
    });
    // Anexa o handler de rejeição já no mesmo tick da criação — evita o
    // warning de unhandled rejection entre o flush (assíncrono) e o assert.
    const erro = promise.catch((e) => e);

    httpMock
      .expectOne((r) => r.url.includes('/produtos'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne((r) => r.url.includes('/auth/refresh'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await flushPromises();

    expect(await erro).toBeTruthy();
    expect(authState().isAuthenticated).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('duas requisições com 401 simultâneo disparam apenas UM refresh', async () => {
    setAuth('token-velho', usuario);

    const p1 = new Promise<unknown>((resolve, reject) => {
      http.get(`${environment.apiUrl}/produtos`).subscribe({ next: resolve, error: reject });
    });
    const p2 = new Promise<unknown>((resolve, reject) => {
      http.get(`${environment.apiUrl}/comandas`).subscribe({ next: resolve, error: reject });
    });

    httpMock
      .expectOne((r) => r.url.includes('/produtos'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne((r) => r.url.includes('/comandas'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    // Só deve existir UMA requisição de refresh em voo pras duas falhas acima.
    const refreshReqs = httpMock.match((r) => r.url.includes('/auth/refresh'));
    expect(refreshReqs.length).toBe(1);
    refreshReqs[0].flush({ accessToken: 'token-novo', user: usuario });
    await flushPromises();

    httpMock.expectOne((r) => r.url.includes('/produtos')).flush([]);
    httpMock.expectOne((r) => r.url.includes('/comandas')).flush([]);

    await Promise.all([p1, p2]);
  });

  it('rota /master/ usa o token master e redireciona para /master/login em 401, sem lançar erro de contexto de injeção', async () => {
    setMasterAuth('master-token', { id: 'm1', email: 'master@test.com' });

    const promise = new Promise<unknown>((resolve, reject) => {
      http.get(`${environment.apiUrl}/master/tenants`).subscribe({ next: resolve, error: reject });
    });
    const erro = promise.catch((e) => e);

    const req = httpMock.expectOne((r) => r.url.includes('/master/tenants'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer master-token');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(await erro).toBeTruthy();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/master/login');
  });

  it('sessão master e sessão de usuário são independentes — 401 numa não mexe na outra', async () => {
    setAuth('token-usuario', usuario);
    setMasterAuth('master-token', { id: 'm1', email: 'master@test.com' });

    const promise = new Promise<unknown>((resolve, reject) => {
      http.get(`${environment.apiUrl}/master/tenants`).subscribe({ next: resolve, error: reject });
    });
    const erro = promise.catch((e) => e);

    httpMock
      .expectOne((r) => r.url.includes('/master/tenants'))
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(await erro).toBeTruthy();
    expect(masterAuthState().token).toBeNull();
    expect(authState().token).toBe('token-usuario');
  });
});
