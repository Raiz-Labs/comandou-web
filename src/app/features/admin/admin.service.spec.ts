import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { ApiService } from '../../core/api/api.service';
import { environment } from '../../../environments/environment';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService, ApiService],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('buscarDashboard: agrega relatório, mesas e comandas abertas em paralelo', async () => {
    const promise = service.buscarDashboard();

    httpMock.expectOne(`${environment.apiUrl}/relatorios/vendas?periodo=hoje`).flush({ totalVendas: 100 });
    httpMock.expectOne(`${environment.apiUrl}/mesas`).flush([{ id: 'mesa-1' }]);
    httpMock.expectOne(`${environment.apiUrl}/comandas?aberta=true`).flush([{ id: 'comanda-1' }]);

    const resultado = await promise;
    expect(resultado.relatorio).toEqual({ totalVendas: 100 });
    expect(resultado.mesas).toHaveLength(1);
    expect(resultado.comandasAbertas).toHaveLength(1);
  });

  it('criarProduto: faz POST em /produtos com o payload', async () => {
    const payload = { nome: 'Suco', preco: 8, categoriaId: 'cat-1', estoque: 5, disponivel: true };
    const promise = service.criarProduto(payload);

    const req = httpMock.expectOne(`${environment.apiUrl}/produtos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'novo', ...payload });

    const resultado = await promise;
    expect(resultado.id).toBe('novo');
  });

  it('excluirCategoria: faz DELETE em /categorias/:id', async () => {
    const promise = service.excluirCategoria('cat-1');

    const req = httpMock.expectOne(`${environment.apiUrl}/categorias/cat-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await expect(promise).resolves.toBeNull();
  });

  it('editarMesa: faz PATCH em /mesas/:id com o payload parcial', async () => {
    const promise = service.editarMesa('mesa-1', { descricao: 'Varanda' });

    const req = httpMock.expectOne(`${environment.apiUrl}/mesas/mesa-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ descricao: 'Varanda' });
    req.flush({ id: 'mesa-1', numero: 3, descricao: 'Varanda' });

    const resultado = await promise;
    expect(resultado.descricao).toBe('Varanda');
  });

  it('toggleUsuarioAtivo: faz PATCH em /usuarios/:id com o novo status', async () => {
    const promise = service.toggleUsuarioAtivo('user-1', false);

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios/user-1`);
    expect(req.request.body).toEqual({ ativo: false });
    req.flush({ id: 'user-1', ativo: false });

    const resultado = await promise;
    expect(resultado.ativo).toBe(false);
  });

  it('propaga erro do servidor (ex: e-mail duplicado ao criar usuário)', async () => {
    const promise = service.criarUsuario({
      nome: 'Ana', email: 'ana@test.com', senha: '123456', perfil: 'garcom',
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    req.flush({}, { status: 409, statusText: 'Conflict' });

    await expect(promise).rejects.toBeTruthy();
  });
});
