import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CozinhaService } from './cozinha.service';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';

describe('CozinhaService', () => {
  let service: CozinhaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CozinhaService, ApiService],
    });
    service = TestBed.inject(CozinhaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('listarFila: busca a fila da cozinha', async () => {
    const promise = service.listarFila();

    const req = httpMock.expectOne(`${environment.apiUrl}/cozinha/fila`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'item-1' }]);

    const resultado = await promise;
    expect(resultado).toHaveLength(1);
  });

  it('marcarEmPreparo: faz PATCH com status em_preparo', async () => {
    const promise = service.marcarEmPreparo('comanda-1', 'item-1');

    const req = httpMock.expectOne(
      `${environment.apiUrl}/comandas/comanda-1/itens/item-1/status`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'em_preparo' });
    req.flush({ id: 'item-1', status: 'em_preparo' });

    const resultado = await promise;
    expect(resultado.status).toBe('em_preparo');
  });

  it('marcarPronto: faz PATCH com status pronto', async () => {
    const promise = service.marcarPronto('comanda-1', 'item-1');

    const req = httpMock.expectOne(
      `${environment.apiUrl}/comandas/comanda-1/itens/item-1/status`,
    );
    expect(req.request.body).toEqual({ status: 'pronto' });
    req.flush({ id: 'item-1', status: 'pronto' });

    const resultado = await promise;
    expect(resultado.status).toBe('pronto');
  });

  it('propaga erro quando o servidor recusa a transição de status', async () => {
    const promise = service.marcarPronto('comanda-1', 'item-1');

    const req = httpMock.expectOne(
      `${environment.apiUrl}/comandas/comanda-1/itens/item-1/status`,
    );
    req.flush({}, { status: 422, statusText: 'Unprocessable Entity' });

    await expect(promise).rejects.toBeTruthy();
  });
});
