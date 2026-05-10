import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MesaComandasComponent } from './mesa-comandas.component';
import { GarcomService } from '../garcom.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Comanda, Mesa } from '../../../shared/types';
import { of } from 'rxjs';

const makeMesa = (): Mesa => ({
  id: 'mesa-1',
  numero: 1,
  status: 'livre',
  descricao: undefined,
});

const makeComanda = (overrides: Partial<Comanda> = {}): Comanda => ({
  id: 'cmd-abc',
  mesaId: 'mesa-1',
  itens: [],
  total: 0,
  aberta: true,
  criadoEm: new Date().toISOString(),
  ...overrides,
});

describe('MesaComandasComponent — modal nomeCliente', () => {
  const garcomServiceMock = {
    buscarMesa: vi.fn().mockResolvedValue(makeMesa()),
    listarComandasDaMesa: vi.fn().mockResolvedValue([]),
    abrirComanda: vi.fn().mockResolvedValue(makeComanda()),
  };

  const routerMock = { navigate: vi.fn() };
  const toastMock = { success: vi.fn(), danger: vi.fn() };
  const socketMock = {
    on: () => of(null),
    connectionStatus: signal('connected' as const),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    garcomServiceMock.buscarMesa.mockResolvedValue(makeMesa());
    garcomServiceMock.listarComandasDaMesa.mockResolvedValue([]);
    garcomServiceMock.abrirComanda.mockResolvedValue(makeComanda());

    await TestBed.configureTestingModule({
      imports: [MesaComandasComponent],
      providers: [
        provideRouter([]),
        { provide: GarcomService, useValue: garcomServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ToastService, useValue: toastMock },
        { provide: SocketService, useValue: socketMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { mesaId: 'mesa-1' } } },
        },
      ],
    }).compileComponents();
  });

  it('deve iniciar com o modal fechado', () => {
    const fixture = TestBed.createComponent(MesaComandasComponent);
    const comp = fixture.componentInstance;
    expect(comp['modalNomeAberto']()).toBe(false);
  });

  it('abrirModalNome deve abrir o modal e limpar o input', () => {
    const fixture = TestBed.createComponent(MesaComandasComponent);
    const comp = fixture.componentInstance;
    comp['nomeClienteInput'] = 'valor anterior';
    comp['abrirModalNome']();
    expect(comp['modalNomeAberto']()).toBe(true);
    expect(comp['nomeClienteInput']).toBe('');
  });

  it('fecharModalNome deve fechar o modal e limpar o input', () => {
    const fixture = TestBed.createComponent(MesaComandasComponent);
    const comp = fixture.componentInstance;
    comp['modalNomeAberto'].set(true);
    comp['nomeClienteInput'] = 'João';
    comp['fecharModalNome']();
    expect(comp['modalNomeAberto']()).toBe(false);
    expect(comp['nomeClienteInput']).toBe('');
  });

  it('confirmarAbertura deve chamar abrirComanda com nomeCliente preenchido', async () => {
    const fixture = TestBed.createComponent(MesaComandasComponent);
    const comp = fixture.componentInstance;
    comp['modalNomeAberto'].set(true);
    comp['nomeClienteInput'] = 'Maria';

    await comp['confirmarAbertura']();

    expect(garcomServiceMock.abrirComanda).toHaveBeenCalledWith('mesa-1', 'Maria');
    expect(toastMock.success).toHaveBeenCalledWith('Comanda aberta!');
  });

  it('confirmarAbertura deve chamar abrirComanda sem nomeCliente quando input vazio', async () => {
    const fixture = TestBed.createComponent(MesaComandasComponent);
    const comp = fixture.componentInstance;
    comp['modalNomeAberto'].set(true);
    comp['nomeClienteInput'] = '   ';

    await comp['confirmarAbertura']();

    expect(garcomServiceMock.abrirComanda).toHaveBeenCalledWith('mesa-1', undefined);
  });

  it('confirmarAbertura deve exibir toast de erro quando service falha', async () => {
    garcomServiceMock.abrirComanda.mockRejectedValue(new Error('server error'));
    const fixture = TestBed.createComponent(MesaComandasComponent);
    const comp = fixture.componentInstance;
    comp['modalNomeAberto'].set(true);

    await comp['confirmarAbertura']();

    expect(toastMock.danger).toHaveBeenCalled();
    expect(comp['abrindo']()).toBe(false);
  });

  it('deve fechar o modal após confirmar abertura com sucesso', async () => {
    const fixture = TestBed.createComponent(MesaComandasComponent);
    const comp = fixture.componentInstance;
    comp['modalNomeAberto'].set(true);

    await comp['confirmarAbertura']();

    expect(comp['modalNomeAberto']()).toBe(false);
  });
});
