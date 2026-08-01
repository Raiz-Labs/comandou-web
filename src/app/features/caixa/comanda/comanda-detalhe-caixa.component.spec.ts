import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Plus,
  User,
  Users,
  WifiOff,
} from 'lucide-angular';
import { ComandaDetalheCaixaComponent } from './comanda-detalhe-caixa.component';
import { CaixaService } from '../caixa.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Comanda, ItemComanda } from '../../../shared/types';

const makeItem = (overrides: Partial<ItemComanda> = {}): ItemComanda => ({
  id: 'item-1',
  produtoId: 'produto-1',
  produto: {
    id: 'produto-1',
    nome: 'X-Burguer',
    preco: 33.33,
    categoriaId: 'cat-1',
    estoque: 10,
    disponivel: true,
  },
  quantidade: 1,
  preco: 33.33,
  total: 33.33,
  status: 'entregue',
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
  ...overrides,
});

const makeComanda = (overrides: Partial<Comanda> = {}): Comanda => ({
  id: 'comanda-1',
  mesaId: 'mesa-1',
  itens: [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c' })],
  total: 99.99,
  aberta: true,
  criadoEm: new Date().toISOString(),
  ...overrides,
});

describe('ComandaDetalheCaixaComponent — revalidação de divisão de conta', () => {
  let caixaServiceMock: {
    buscarComanda: ReturnType<typeof vi.fn>;
    dividirConta: ReturnType<typeof vi.fn>;
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; danger: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    caixaServiceMock = {
      buscarComanda: vi.fn().mockResolvedValue(makeComanda()),
      dividirConta: vi.fn(),
    };
    toastMock = { success: vi.fn(), danger: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ComandaDetalheCaixaComponent],
      providers: [
        { provide: CaixaService, useValue: caixaServiceMock },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 'comanda-1' } } } },
        { provide: ToastService, useValue: toastMock },
        {
          provide: SocketService,
          useValue: { on: () => of(null), connectionStatus: signal('connected' as const) },
        },
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({
            ArrowLeft,
            Calculator,
            CheckCircle2,
            Loader2,
            Minus,
            Package,
            Plus,
            User,
            Users,
            WifiOff,
          }),
        },
      ],
    });
  });

  it('com 1 divisão, não chama o servidor e abre a confirmação direto', async () => {
    const fixture = TestBed.createComponent(ComandaDetalheCaixaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance['pedirFechamento']();

    expect(caixaServiceMock.dividirConta).not.toHaveBeenCalled();
    expect(fixture.componentInstance['confirmandoFechamento']()).toBe(true);
  });

  it('com divisão > 1, valida no servidor e usa o valor autoritativo na confirmação', async () => {
    caixaServiceMock.dividirConta.mockResolvedValue({
      comandaId: 'comanda-1',
      total: 99.99,
      partes: 3,
      porPessoa: 33.33,
    });

    const fixture = TestBed.createComponent(ComandaDetalheCaixaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['incrementarDivisoes']();
    fixture.componentInstance['incrementarDivisoes']();
    expect(fixture.componentInstance['divisoes']()).toBe(3);

    await fixture.componentInstance['pedirFechamento']();

    expect(caixaServiceMock.dividirConta).toHaveBeenCalledWith('comanda-1', 3);
    expect(fixture.componentInstance['confirmandoFechamento']()).toBe(true);
    expect(fixture.componentInstance['mensagemConfirmacao']()).toContain('R$');
    expect(fixture.componentInstance['mensagemConfirmacao']()).toContain('33,33');
  });

  it('avisa o usuário quando o cálculo local diverge do valor autoritativo do servidor', async () => {
    // Local (float puro): 99.99 / 3 = 33.33 — igual ao servidor aqui de propósito,
    // então forçamos uma divergência simulando um servidor que arredondou diferente.
    caixaServiceMock.dividirConta.mockResolvedValue({
      comandaId: 'comanda-1',
      total: 99.99,
      partes: 3,
      porPessoa: 33.5, // diverge da prévia local (33.33)
    });

    const fixture = TestBed.createComponent(ComandaDetalheCaixaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['incrementarDivisoes']();
    fixture.componentInstance['incrementarDivisoes']();

    await fixture.componentInstance['pedirFechamento']();

    expect(toastMock.danger).toHaveBeenCalledWith(
      expect.stringContaining('ajustado pelo servidor'),
    );
  });

  it('se a validação falhar no servidor, avisa o erro e NÃO abre a confirmação', async () => {
    caixaServiceMock.dividirConta.mockRejectedValue(new Error('network error'));

    const fixture = TestBed.createComponent(ComandaDetalheCaixaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['incrementarDivisoes']();

    await fixture.componentInstance['pedirFechamento']();

    expect(toastMock.danger).toHaveBeenCalled();
    expect(fixture.componentInstance['confirmandoFechamento']()).toBe(false);
  });

  it('em erro de carregamento, mostra a UI de erro e o botão "Tentar novamente" chama comanda.reload()', async () => {
    caixaServiceMock.buscarComanda.mockRejectedValueOnce(new Error('network error'));
    const fixture = TestBed.createComponent(ComandaDetalheCaixaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['comanda'].error()).toBeTruthy();
    const retryBtn = fixture.debugElement.query(By.css('.empty-state button.b-btn-secondary'));
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.nativeElement.textContent).toContain('Tentar novamente');

    caixaServiceMock.buscarComanda.mockResolvedValueOnce(makeComanda());
    retryBtn.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(caixaServiceMock.buscarComanda).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance['comanda'].hasValue()).toBe(true);
  });
});
