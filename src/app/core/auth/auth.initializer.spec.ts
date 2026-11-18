import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { authInitializer } from './auth.initializer';
import { AuthService } from './auth.service';

const erro429 = (retryAfter?: string) =>
  new HttpErrorResponse({
    status: 429,
    headers: retryAfter ? new HttpHeaders({ 'Retry-After': retryAfter }) : new HttpHeaders(),
  });

describe('authInitializer', () => {
  let refresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    refresh = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { refresh } }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  const executar = () => TestBed.runInInjectionContext(() => authInitializer())();

  it('429 no refresh → espera o Retry-After e tenta de novo uma vez', async () => {
    refresh.mockRejectedValueOnce(erro429('2')).mockResolvedValueOnce('token');

    const pronto = executar();
    await vi.advanceTimersByTimeAsync(1999);
    expect(refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await pronto;
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('Retry-After longo → espera no máximo 5s antes de tentar de novo', async () => {
    refresh.mockRejectedValueOnce(erro429('60')).mockResolvedValueOnce('token');

    const pronto = executar();
    await vi.advanceTimersByTimeAsync(5000);
    await pronto;

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('segundo 429 → desiste sem lançar (guard manda para /login)', async () => {
    refresh.mockRejectedValue(erro429('1'));

    const pronto = executar();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(pronto).resolves.toBeUndefined();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('401 (sem cookie) → não tenta de novo', async () => {
    refresh.mockRejectedValueOnce(new HttpErrorResponse({ status: 401 }));

    await executar();

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
