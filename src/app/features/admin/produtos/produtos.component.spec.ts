import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Check,
  Loader2,
  PackageX,
  Pencil,
  Plus,
  Search,
  Trash2,
  WifiOff,
  X,
} from 'lucide-angular';
import { ProdutosComponent } from './produtos.component';
import { AdminService } from '../admin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Produto } from '../../../shared/types';

const makeProduto = (overrides: Partial<Produto> = {}): Produto => ({
  id: 'produto-1',
  nome: 'X-Burguer',
  preco: 20,
  categoriaId: 'cat-1',
  estoque: 5,
  disponivel: true,
  ...overrides,
});

describe('ProdutosComponent — recuperação após edição concorrente (#17)', () => {
  let adminServiceMock: {
    listarProdutos: ReturnType<typeof vi.fn>;
    listarCategorias: ReturnType<typeof vi.fn>;
    editarProduto: ReturnType<typeof vi.fn>;
    criarProduto: ReturnType<typeof vi.fn>;
    excluirProduto: ReturnType<typeof vi.fn>;
    ajustarEstoque: ReturnType<typeof vi.fn>;
  };
  let toastMock: {
    success: ReturnType<typeof vi.fn>;
    danger: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    adminServiceMock = {
      listarProdutos: vi.fn().mockResolvedValue([makeProduto()]),
      listarCategorias: vi.fn().mockResolvedValue([{ id: 'cat-1', nome: 'Lanches', ordem: 1 }]),
      editarProduto: vi.fn(),
      criarProduto: vi.fn(),
      excluirProduto: vi.fn(),
      ajustarEstoque: vi.fn(),
    };
    toastMock = { success: vi.fn(), danger: vi.fn(), warning: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ProdutosComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: ToastService, useValue: toastMock },
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({
            ArrowLeft, Check, Loader2, PackageX, Pencil, Plus, Search, Trash2, WifiOff, X,
          }),
        },
      ],
    });
  });

  it('ao salvar e a categoria não existir mais (404), avisa, recarrega categorias e mantém o painel aberto pra reescolha', async () => {
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp['model'].set({
      nome: 'Produto novo',
      descricao: '',
      preco: '10',
      categoriaId: 'cat-deletada',
      estoque: '0',
      disponivel: true,
    });
    comp['painelAberto'].set(true);

    adminServiceMock.criarProduto.mockRejectedValue(
      new HttpErrorResponse({ status: 404, error: { error: { message: 'Categoria não encontrada' } } }),
    );

    await comp['salvar']();
    await fixture.whenStable();

    expect(toastMock.warning).toHaveBeenCalledWith(
      expect.stringContaining('categoria selecionada não existe mais'),
    );
    expect(adminServiceMock.listarCategorias).toHaveBeenCalledTimes(2); // inicial + reload pós-erro
    expect(comp['painelAberto']()).toBe(true); // continua aberto pra reescolher a categoria
  });

  it('ao excluir um produto já removido por outro admin (404), trata como sucesso idempotente', async () => {
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    const produto = makeProduto();
    comp['produtoParaExcluir'].set(produto);

    adminServiceMock.excluirProduto.mockRejectedValue(new HttpErrorResponse({ status: 404 }));

    await comp['confirmarExclusao']();
    await fixture.whenStable();

    expect(toastMock.info).toHaveBeenCalledWith(expect.stringContaining('já tinha sido removido'));
    expect(toastMock.danger).not.toHaveBeenCalled();
    // Update otimista: remove da lista local em vez de refazer o GET.
    expect(adminServiceMock.listarProdutos).toHaveBeenCalledTimes(1);
    expect(comp['produtos'].value()).toEqual([]);
  });

  it('ao excluir e falhar por outro motivo, mostra erro genérico e ainda assim recarrega', async () => {
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    const produto = makeProduto();
    comp['produtoParaExcluir'].set(produto);

    adminServiceMock.excluirProduto.mockRejectedValue(new HttpErrorResponse({ status: 500 }));

    await comp['confirmarExclusao']();
    await fixture.whenStable();

    expect(toastMock.danger).toHaveBeenCalledWith('Não foi possível excluir o produto.');
    expect(adminServiceMock.listarProdutos).toHaveBeenCalledTimes(2);
  });

  it('salvar com sucesso fecha o painel e adiciona o produto na lista local (update otimista)', async () => {
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp['model'].set({
      nome: 'Produto válido',
      descricao: '',
      preco: '15',
      categoriaId: 'cat-1',
      estoque: '3',
      disponivel: true,
    });
    comp['painelAberto'].set(true);
    adminServiceMock.criarProduto.mockResolvedValue(makeProduto({ id: 'novo' }));

    await comp['salvar']();

    expect(toastMock.success).toHaveBeenCalled();
    expect(comp['painelAberto']()).toBe(false);
    // Update otimista: o produto aparece na lista sem um novo GET.
    expect(adminServiceMock.listarProdutos).toHaveBeenCalledTimes(1);
    expect(comp['produtos'].value()!.map((p: Produto) => p.id)).toContain('novo');
  });

  it('ao editar e mudar o estoque, ajusta via endpoint dedicado com o delta (#35)', async () => {
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    const produto = makeProduto({ estoque: 10 });
    comp['abrirEditar'](produto);
    comp['model'].update(m => ({ ...m, estoque: '25' }));

    adminServiceMock.editarProduto.mockResolvedValue(produto);
    adminServiceMock.ajustarEstoque.mockResolvedValue({ estoqueAtual: 25 });

    await comp['salvar']();
    await fixture.whenStable();

    expect(adminServiceMock.editarProduto).toHaveBeenCalledWith(
      'produto-1',
      expect.not.objectContaining({ estoque: expect.anything() }),
    );
    expect(adminServiceMock.ajustarEstoque).toHaveBeenCalledWith('produto-1', 'entrada', 15);
    // Ajuste de estoque pode mudar `disponivel` no backend — recarrega em vez de update otimista.
    expect(adminServiceMock.listarProdutos).toHaveBeenCalledTimes(2);
  });

  it('ao editar sem mudar o estoque, não chama o endpoint de ajuste', async () => {
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    const produto = makeProduto({ estoque: 10 });
    comp['abrirEditar'](produto);

    adminServiceMock.editarProduto.mockResolvedValue(produto);

    await comp['salvar']();
    await fixture.whenStable();

    expect(adminServiceMock.ajustarEstoque).not.toHaveBeenCalled();
  });

  it('em erro de carregamento, mostra a UI de erro e o botão "Tentar novamente" chama produtos.reload()', async () => {
    adminServiceMock.listarProdutos.mockRejectedValueOnce(new Error('network error'));
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['produtos'].error()).toBeTruthy();
    const retryBtn = fixture.debugElement.query(By.css('.empty-state button.b-btn-secondary'));
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.nativeElement.textContent).toContain('Tentar novamente');

    adminServiceMock.listarProdutos.mockResolvedValueOnce([makeProduto()]);
    retryBtn.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(adminServiceMock.listarProdutos).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance['produtos'].hasValue()).toBe(true);
  });

  it('em erro ao carregar categorias, esconde o select e mostra erro com retry (#45)', async () => {
    adminServiceMock.listarCategorias.mockRejectedValueOnce(new Error('network error'));
    const fixture = TestBed.createComponent(ProdutosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp['abrirCriar']();
    fixture.detectChanges();

    expect(comp['categorias'].error()).toBeTruthy();
    expect(fixture.debugElement.query(By.css('#f-cat'))).toBeFalsy();
    const erro = fixture.debugElement.query(By.css('.campo-erro'));
    expect(erro).toBeTruthy();
    expect(erro.nativeElement.textContent).toContain('Não foi possível carregar as categorias.');
    // Sem categorias carregadas, salvar seria um no-op silencioso (categoriaId
    // nunca preenchido) — o botão fica desabilitado em vez de parecer clicável.
    const salvarBtn = fixture.debugElement.query(By.css('.painel__acoes .b-btn-primary'));
    expect(salvarBtn.nativeElement.disabled).toBe(true);

    adminServiceMock.listarCategorias.mockResolvedValueOnce([{ id: 'cat-1', nome: 'Lanches', ordem: 1 }]);
    const retryBtn = erro.query(By.css('button'));
    retryBtn.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(comp['categorias'].hasValue()).toBe(true);
    const select = fixture.debugElement.query(By.css('#f-cat'));
    expect(select).toBeTruthy();
    expect(select.nativeElement.textContent).toContain('Lanches');
    expect(fixture.debugElement.query(By.css('.painel__acoes .b-btn-primary')).nativeElement.disabled).toBe(false);
  });
});
