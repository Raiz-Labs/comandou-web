import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ChefHat,
  RefreshCw,
  Clock,
  Flame,
  CheckCircle2,
  Table2,
  MessageSquare,
  Timer,
  Loader2,
  Play,
  Check,
  WifiOff,
} from 'lucide-angular';
import { FilaComponent } from './fila.component';
import { CozinhaService } from '../cozinha.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

describe('FilaComponent — subscriptions WebSocket', () => {
  let itemNovo$: Subject<unknown>;
  let itemAtualizado$: Subject<unknown>;
  let itemCancelado$: Subject<unknown>;
  let cozinhaServiceMock: { listarFila: ReturnType<typeof vi.fn> };
  let socketMock: { on: ReturnType<typeof vi.fn>; connectionStatus: ReturnType<typeof signal> };

  beforeEach(() => {
    itemNovo$ = new Subject();
    itemAtualizado$ = new Subject();
    itemCancelado$ = new Subject();

    cozinhaServiceMock = { listarFila: vi.fn().mockResolvedValue([]) };
    socketMock = {
      on: vi.fn((event: string) => {
        if (event === 'item:novo') return itemNovo$;
        if (event === 'item:atualizado') return itemAtualizado$;
        if (event === 'item:cancelado') return itemCancelado$;
        throw new Error(`evento inesperado registrado pelo componente: ${event}`);
      }),
      connectionStatus: signal('connected' as const),
    };

    TestBed.configureTestingModule({
      imports: [FilaComponent],
      providers: [
        { provide: CozinhaService, useValue: cozinhaServiceMock },
        { provide: SocketService, useValue: socketMock },
        { provide: ToastService, useValue: { success: vi.fn(), danger: vi.fn() } },
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({
            ChefHat,
            RefreshCw,
            Clock,
            Flame,
            CheckCircle2,
            Table2,
            MessageSquare,
            Timer,
            Loader2,
            Play,
            Check,
            WifiOff,
          }),
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('recarrega a fila ao receber item:novo, item:atualizado ou item:cancelado', async () => {
    const fixture = TestBed.createComponent(FilaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(cozinhaServiceMock.listarFila).toHaveBeenCalledTimes(1);

    itemNovo$.next({});
    await fixture.whenStable();
    expect(cozinhaServiceMock.listarFila).toHaveBeenCalledTimes(2);

    itemAtualizado$.next({});
    await fixture.whenStable();
    expect(cozinhaServiceMock.listarFila).toHaveBeenCalledTimes(3);

    itemCancelado$.next({});
    await fixture.whenStable();
    expect(cozinhaServiceMock.listarFila).toHaveBeenCalledTimes(4);

    fixture.destroy();
  });

  it('ngOnDestroy cancela as subscriptions — evento após destroy não recarrega mais', async () => {
    const fixture = TestBed.createComponent(FilaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(cozinhaServiceMock.listarFila).toHaveBeenCalledTimes(1);

    fixture.destroy();

    itemNovo$.next({});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cozinhaServiceMock.listarFila).toHaveBeenCalledTimes(1);
  });

  it('eventos simultâneos não quebram o componente nem deixam o resource em estado inconsistente', async () => {
    const fixture = TestBed.createComponent(FilaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    // resource() naturalmente supera reloads sobrepostos (o mais recente
    // cancela os anteriores em voo) — o que importa aqui é que os 3 disparos
    // simultâneos não derrubem o componente nem travem em loading.
    itemNovo$.next({});
    itemAtualizado$.next({});
    itemCancelado$.next({});
    await fixture.whenStable();

    expect(cozinhaServiceMock.listarFila.mock.calls.length).toBeGreaterThan(1);
    expect(fixture.componentInstance['fila'].isLoading()).toBe(false);
    expect(fixture.componentInstance['fila'].error()).toBeUndefined();
    fixture.destroy();
  });

  it('em erro de carregamento, mostra a UI de erro e o botão "Tentar novamente" chama fila.reload()', async () => {
    cozinhaServiceMock.listarFila.mockRejectedValueOnce(new Error('network error'));
    const fixture = TestBed.createComponent(FilaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['fila'].error()).toBeTruthy();
    const retryBtn = fixture.debugElement.query(By.css('.b-empty-state button.b-btn-secondary'));
    expect(retryBtn).toBeTruthy();

    cozinhaServiceMock.listarFila.mockResolvedValueOnce([]);
    retryBtn.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(cozinhaServiceMock.listarFila).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance['fila'].error()).toBeUndefined();
    fixture.destroy();
  });
});
