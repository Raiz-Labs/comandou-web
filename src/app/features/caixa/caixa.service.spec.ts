import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CaixaService } from './caixa.service';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';

describe('CaixaService — dividirConta', () => {
  let service: CaixaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CaixaService, ApiService],
    });
    service = TestBed.inject(CaixaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('envia o número de partes e retorna o valor por pessoa calculado pelo servidor', async () => {
    const promise = service.dividirConta('comanda-1', 3);

    const req = httpMock.expectOne(`${environment.apiUrl}/comandas/comanda-1/dividir`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ partes: 3 });
    // R$ 100,00 em 3 partes — o servidor arredonda com Decimal, não float puro.
    req.flush({ comandaId: 'comanda-1', total: 100, partes: 3, porPessoa: 33.33 });

    const resultado = await promise;
    expect(resultado.porPessoa).toBe(33.33);
    expect(resultado.total).toBe(100);
  });

  it('propaga o erro quando o servidor recusa a divisão (ex: comanda já fechada)', async () => {
    const promise = service.dividirConta('comanda-1', 2);

    const req = httpMock.expectOne(`${environment.apiUrl}/comandas/comanda-1/dividir`);
    req.flush({}, { status: 404, statusText: 'Not Found' });

    await expect(promise).rejects.toBeTruthy();
  });
});
