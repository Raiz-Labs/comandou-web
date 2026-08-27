import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NEVER } from 'rxjs';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  MessageSquare,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  WifiOff,
  X,
  XCircle,
} from 'lucide-angular';
import { ComandaDetalheComponent } from './comanda-detalhe.component';
import { GarcomService } from '../garcom.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Comanda, ItemComanda } from '../../../shared/types';

const makeItem = (overrides: Partial<ItemComanda> = {}): ItemComanda => ({
  id: 'item-1',
  produtoId: 'produto-1',
  produto: {
    id: 'produto-1',
    nome: 'X-Burguer',
    preco: 20,
    categoriaId: 'cat-1',
    estoque: 10,
    disponivel: true,
  },
  quantidade: 1,
  preco: 20,
  total: 20,
  status: 'pendente',
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
  ...overrides,
});

const makeComanda = (overrides: Partial<Comanda> = {}): Comanda => ({
  id: 'comanda-1',
  mesaId: 'mesa-1',
  itens: [makeItem()],
  total: 20,
  aberta: true,
  criadoEm: new Date().toISOString(),
  ...overrides,
});

describe('ComandaDetalheComponent — recuperação de estado da UI', () => {
  let garcomServiceMock: {
    buscarComanda: ReturnType<typeof vi.fn>;
    listarCategorias: ReturnType<typeof vi.fn>;
    listarProdutosDisponiveis: ReturnType<typeof vi.fn>;
    adicionarItem: ReturnType<typeof vi.fn>;
    editarItem: ReturnType<typeof vi.fn>;
    cancelarItem: ReturnType<typeof vi.fn>;
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; danger: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    garcomServiceMock = {
      buscarComanda: vi.fn().mockResolvedValue(makeComanda()),
      listarCategorias: vi.fn().mockResolvedValue([]),
      listarProdutosDisponiveis: vi.fn().mockResolvedValue([]),
      adicionarItem: vi.fn().mockResolvedValue(makeItem({ id: 'novo-item' })),
      editarItem: vi.fn().mockResolvedValue(makeItem()),
      cancelarItem: vi.fn().mockResolvedValue(undefined),
    };
    toastMock = { success: vi.fn(), danger: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ComandaDetalheComponent],
      providers: [
        { provide: GarcomService, useValue: garcomServiceMock },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 'comanda-1' } } } },
        { provide: ToastService, useValue: toastMock },
        {
          provide: SocketService,
          useValue: { on: () => NEVER, connectionStatus: signal('connected' as const) },
        },
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({
            ArrowLeft,
            Check,
            Loader2,
            Lock,
            MessageSquare,
            Minus,
            Pencil,
            Plus,
            RefreshCw,
            Search,
            ShoppingBag,
            WifiOff,
            X,
            XCircle,
          }),
        },
      ],
    });
  });

  it('quando a comanda entra em erro com um sheet aberto, reseta o uiStep pra "lista"', async () => {
    const fixture = TestBed.createComponent(ComandaDetalheComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['uiStep'].set('edicao');
    fixture.componentInstance['itemEmEdicao'].set(makeItem());
    expect(fixture.componentInstance['uiStep']()).toBe('edicao');

    garcomServiceMock.buscarComanda.mockRejectedValueOnce(new Error('network error'));
    fixture.componentInstance['comanda'].reload();
    await fixture.whenStable();
    TestBed.flushEffects();

    expect(fixture.componentInstance['uiStep']()).toBe('lista');
    expect(fixture.componentInstance['itemEmEdicao']()).toBeNull();
  });

  it('confirmarEdicao não envia a chamada se o item deixou de ser editável nesse meio-tempo', async () => {
    const fixture = TestBed.createComponent(ComandaDetalheComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const item = makeItem({ status: 'pendente' });
    fixture.componentInstance['itemEmEdicao'].set(item);
    fixture.componentInstance['uiStep'].set('edicao');

    // WS trouxe uma atualização: o item já foi pro preparo (não é mais editável).
    garcomServiceMock.buscarComanda.mockResolvedValueOnce(
      makeComanda({ itens: [makeItem({ status: 'em_preparo' })] }),
    );
    fixture.componentInstance['comanda'].reload();
    await fixture.whenStable();

    await fixture.componentInstance['confirmarEdicao']({ quantidade: 1 });

    expect(garcomServiceMock.editarItem).not.toHaveBeenCalled();
    expect(toastMock.danger).toHaveBeenCalledWith('Este item não pode mais ser editado.');
    expect(fixture.componentInstance['uiStep']()).toBe('lista');
  });

  it('confirmarCancelamento não envia a chamada se o item já não existe mais na comanda', async () => {
    const fixture = TestBed.createComponent(ComandaDetalheComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const item = makeItem({ id: 'sumiu', status: 'pendente' });
    fixture.componentInstance['itemParaCancelar'].set(item);

    // O item foi removido da comanda por outra ação concorrente.
    garcomServiceMock.buscarComanda.mockResolvedValueOnce(makeComanda({ itens: [] }));
    fixture.componentInstance['comanda'].reload();
    await fixture.whenStable();

    await fixture.componentInstance['confirmarCancelamento']();

    expect(garcomServiceMock.cancelarItem).not.toHaveBeenCalled();
    expect(toastMock.danger).toHaveBeenCalledWith('Este item não pode mais ser cancelado.');
  });

  it('confirmarEdicao funciona normalmente quando o item continua editável', async () => {
    const fixture = TestBed.createComponent(ComandaDetalheComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const item = makeItem({ status: 'pendente' });
    fixture.componentInstance['itemEmEdicao'].set(item);
    fixture.componentInstance['uiStep'].set('edicao');

    await fixture.componentInstance['confirmarEdicao']({ quantidade: 2 });

    expect(garcomServiceMock.editarItem).toHaveBeenCalledWith('comanda-1', item.id, {
      quantidade: 2,
      observacao: undefined,
    });
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('em erro de carregamento, mostra a UI de erro e o botão "Tentar novamente" chama comanda.reload()', async () => {
    garcomServiceMock.buscarComanda.mockRejectedValueOnce(new Error('network error'));
    const fixture = TestBed.createComponent(ComandaDetalheComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['comanda'].error()).toBeTruthy();
    const retryBtn = fixture.debugElement.query(By.css('.b-empty-state button.b-btn-secondary'));
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.nativeElement.textContent).toContain('Tentar novamente');

    garcomServiceMock.buscarComanda.mockResolvedValueOnce(makeComanda());
    retryBtn.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(garcomServiceMock.buscarComanda).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance['comanda'].error()).toBeFalsy();
    expect(fixture.componentInstance['comanda'].hasValue()).toBe(true);
  });

  it('confirmarAdicao: update otimista adiciona o item local sem refazer o GET da comanda (#13)', async () => {
    const fixture = TestBed.createComponent(ComandaDetalheComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp['produtoSelecionado'].set({
      id: 'produto-x', nome: 'Suco', preco: 8, categoriaId: 'cat-1', estoque: 5, disponivel: true,
    });

    await comp['confirmarAdicao']({ quantidade: 2 });

    expect(garcomServiceMock.buscarComanda).toHaveBeenCalledTimes(1); // só o load inicial
    const itens = comp['comanda'].value()!.itens;
    expect(itens.some((i: ItemComanda) => i.id === 'novo-item')).toBe(true);
  });

  it('confirmarEdicao: update otimista substitui o item local sem refazer o GET da comanda (#13)', async () => {
    garcomServiceMock.editarItem.mockResolvedValue(makeItem({ quantidade: 5 }));
    const fixture = TestBed.createComponent(ComandaDetalheComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp['itemEmEdicao'].set(makeItem({ status: 'pendente' }));
    comp['uiStep'].set('edicao');

    await comp['confirmarEdicao']({ quantidade: 5 });

    expect(garcomServiceMock.buscarComanda).toHaveBeenCalledTimes(1);
    const itens = comp['comanda'].value()!.itens;
    expect(itens.find((i: ItemComanda) => i.id === 'item-1')?.quantidade).toBe(5);
  });

  it('confirmarCancelamento: update otimista marca o item como cancelado localmente sem refazer o GET (#13)', async () => {
    const fixture = TestBed.createComponent(ComandaDetalheComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp['itemParaCancelar'].set(makeItem({ status: 'pendente' }));

    await comp['confirmarCancelamento']();

    expect(garcomServiceMock.buscarComanda).toHaveBeenCalledTimes(1);
    const itens = comp['comanda'].value()!.itens;
    expect(itens.find((i: ItemComanda) => i.id === 'item-1')?.status).toBe('cancelado');
  });
});
