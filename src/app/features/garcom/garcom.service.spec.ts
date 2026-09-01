import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GarcomService } from './garcom.service';
import { ApiService } from '../../core/api/api.service';
import { Comanda } from '../../shared/types';

const makeComanda = (overrides: Partial<Comanda> = {}): Comanda => ({
  id: 'abc-123',
  mesaId: 'mesa-1',
  itens: [],
  total: 0,
  aberta: true,
  criadoEm: new Date().toISOString(),
  ...overrides,
});

describe('GarcomService — abrirComanda', () => {
  let service: GarcomService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GarcomService, ApiService],
    });
    service = TestBed.inject(GarcomService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('deve enviar apenas mesaId quando nomeCliente não é fornecido', async () => {
    const esperado = makeComanda({ nomeCliente: null });
    const promise = service.abrirComanda('mesa-1');

    const req = httpMock.expectOne((r) => r.url.includes('/comandas'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mesaId: 'mesa-1' });
    expect(req.request.body['nomeCliente']).toBeUndefined();
    req.flush(esperado);

    const result = await promise;
    expect(result.id).toBe('abc-123');
  });

  it('deve incluir nomeCliente no payload quando fornecido', async () => {
    const esperado = makeComanda({ nomeCliente: 'João' });
    const promise = service.abrirComanda('mesa-1', 'João');

    const req = httpMock.expectOne((r) => r.url.includes('/comandas'));
    expect(req.request.body).toEqual({ mesaId: 'mesa-1', nomeCliente: 'João' });
    req.flush(esperado);

    const result = await promise;
    expect(result.nomeCliente).toBe('João');
  });

  it('deve aplicar trim no nomeCliente antes de enviar', async () => {
    const esperado = makeComanda({ nomeCliente: 'Maria' });
    const promise = service.abrirComanda('mesa-1', '  Maria  ');

    const req = httpMock.expectOne((r) => r.url.includes('/comandas'));
    expect(req.request.body['nomeCliente']).toBe('Maria');
    req.flush(esperado);

    await promise;
  });

  it('deve omitir nomeCliente quando string contiver apenas espaços', async () => {
    const esperado = makeComanda({ nomeCliente: null });
    const promise = service.abrirComanda('mesa-1', '   ');

    const req = httpMock.expectOne((r) => r.url.includes('/comandas'));
    expect(req.request.body['nomeCliente']).toBeUndefined();
    req.flush(esperado);

    await promise;
  });
});

describe('GarcomService — limit explícito nas listagens paginadas (#19)', () => {
  let service: GarcomService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GarcomService, ApiService],
    });
    service = TestBed.inject(GarcomService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  // Sem limit explícito, o default de paginação do backend (50) cortaria
  // mesas/categorias/produtos silenciosamente em tenants maiores — mesmo
  // bug que a paginação do admin (#19) corrigiu do outro lado.
  it('listarMesas manda limit=100', async () => {
    const promise = service.listarMesas();
    const req = httpMock.expectOne((r) => r.url.includes('/mesas'));
    expect(req.request.params.get('limit')).toBe('100');
    req.flush([]);
    await promise;
  });

  it('listarCategorias manda limit=100', async () => {
    const promise = service.listarCategorias();
    const req = httpMock.expectOne((r) => r.url.includes('/categorias'));
    expect(req.request.params.get('limit')).toBe('100');
    req.flush([]);
    await promise;
  });

  it('listarProdutosDisponiveis manda disponivel=true e limit=100', async () => {
    const promise = service.listarProdutosDisponiveis();
    const req = httpMock.expectOne((r) => r.url.includes('/produtos'));
    expect(req.request.params.get('disponivel')).toBe('true');
    expect(req.request.params.get('limit')).toBe('100');
    req.flush([]);
    await promise;
  });
});
