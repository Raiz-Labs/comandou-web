import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ApiService, API_TIMEOUT_MS } from './api.service';
import { environment } from '../../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('rejeita a promise se a requisição travar sem nunca responder', async () => {
    vi.useFakeTimers();

    const promise = firstValueFrom(service.get(`/nunca-responde`));
    const errorHandler = vi.fn();
    promise.catch(errorHandler);

    httpMock.expectOne(`${environment.apiUrl}/nunca-responde`);
    // Não chama req.flush() — simula uma requisição que trava na rede.

    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1);

    await expect(promise).rejects.toBeTruthy();
  });

  it('resolve normalmente quando a resposta chega dentro do timeout', async () => {
    vi.useFakeTimers();

    const promise = firstValueFrom(service.get<{ ok: boolean }>('/rapido'));

    const req = httpMock.expectOne(`${environment.apiUrl}/rapido`);
    req.flush({ ok: true });

    await expect(promise).resolves.toEqual({ ok: true });
  });
});
