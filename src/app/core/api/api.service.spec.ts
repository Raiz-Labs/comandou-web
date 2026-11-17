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

  it('getPaged combina o corpo (array) com total/totalPages dos headers', async () => {
    const promise = firstValueFrom(service.getPaged<{ id: number }>('/itens', { page: '2' }));

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/itens`);
    expect(req.request.params.get('page')).toBe('2');
    req.flush([{ id: 1 }, { id: 2 }], {
      headers: { 'X-Total-Count': '17', 'X-Total-Pages': '9' },
    });

    await expect(promise).resolves.toEqual({ items: [{ id: 1 }, { id: 2 }], total: 17, totalPages: 9 });
  });

  it('getPaged trata total ausente como 0 e totalPages ausente como 1', async () => {
    const promise = firstValueFrom(service.getPaged<{ id: number }>('/itens'));

    const req = httpMock.expectOne(`${environment.apiUrl}/itens`);
    req.flush([]);

    await expect(promise).resolves.toEqual({ items: [], total: 0, totalPages: 1 });
  });
});
