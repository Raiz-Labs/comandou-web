import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  resource,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CozinhaService, ItemFila } from '../cozinha.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-fila',
  standalone: true,
  imports: [SkeletonComponent, ConnectionBannerComponent, LucideAngularModule],
  template: `
    <div class="layout">
      <app-connection-banner />

      <header class="header">
        <div class="header__left">
          <lucide-icon name="chef-hat" [size]="24" color="var(--b-primary-500)" />
          <h1 class="header__title">Fila da cozinha</h1>
        </div>
        <div class="header__right">
          <span class="header__clock">{{ horaAtual() }}</span>
          <button
            class="btn-reload"
            (click)="fila.reload()"
            [disabled]="fila.isLoading()"
            aria-label="Recarregar"
          >
            <lucide-icon name="refresh-cw" [size]="16" [class.spin]="fila.isLoading()" />
          </button>
        </div>
      </header>

      <div class="counters">
        <div class="counter counter--pendente">
          <span class="counter__num">{{ pendentes().length }}</span>
          <span class="counter__label">
            <lucide-icon name="clock" [size]="13" />
            pendente{{ pendentes().length !== 1 ? 's' : '' }}
          </span>
        </div>
        <div class="counter counter--preparo">
          <span class="counter__num">{{ emPreparo().length }}</span>
          <span class="counter__label">
            <lucide-icon name="flame" [size]="13" />
            em preparo
          </span>
        </div>
      </div>

      <main class="board">
        <!-- Coluna: Pendentes -->
        <section class="coluna">
          <h2 class="coluna__titulo coluna__titulo--pendente">
            <lucide-icon name="clock" [size]="16" />
            Pendentes
          </h2>

          @if (fila.isLoading()) {
            @for (i of skeletons; track i) {
              <div class="item-card item-card--skeleton">
                <app-skeleton height="1.125rem" width="65%" />
                <app-skeleton height="0.875rem" width="45%" />
                <app-skeleton height="2.5rem" width="100%" />
              </div>
            }
          } @else if (pendentes().length === 0) {
            <div class="coluna__vazia">
              <lucide-icon name="check-circle-2" [size]="32" color="var(--b-success-500)" />
              <span>Tudo em dia!</span>
            </div>
          } @else {
            @for (item of pendentes(); track item.id) {
              <div class="item-card item-card--pendente">
                <div class="item-card__mesa">
                  <lucide-icon name="table-2" [size]="13" />
                  Mesa {{ item.comanda.mesa?.numero ?? '—' }}
                  <span class="item-card__comanda">#{{ item.comandaId.slice(-4).toUpperCase() }}</span>
                </div>
                <div class="item-card__nome">{{ item.produto?.nome ?? 'Produto' }}</div>
                <div class="item-card__detalhes">
                  <span class="item-card__qtd">{{ item.quantidade }}x</span>
                  @if (item.observacao) {
                    <span class="item-card__obs">
                      <lucide-icon name="message-square" [size]="12" />
                      {{ item.observacao }}
                    </span>
                  }
                </div>
                <div class="item-card__tempo">
                  <lucide-icon name="timer" [size]="12" />
                  {{ tempoEspera(item.criadoEm) }}
                </div>
                <button
                  class="item-card__btn btn-iniciar"
                  [disabled]="processando().has(item.id)"
                  (click)="iniciarPreparo(item)"
                >
                  @if (processando().has(item.id)) {
                    <lucide-icon name="loader-2" [size]="16" class="spin" />
                  } @else {
                    <lucide-icon name="play" [size]="16" />
                    Iniciar preparo
                  }
                </button>
              </div>
            }
          }
        </section>

        <!-- Coluna: Em preparo -->
        <section class="coluna">
          <h2 class="coluna__titulo coluna__titulo--preparo">
            <lucide-icon name="flame" [size]="16" />
            Em preparo
          </h2>

          @if (fila.isLoading()) {
            @for (i of skeletons; track i) {
              <div class="item-card item-card--skeleton">
                <app-skeleton height="1.125rem" width="65%" />
                <app-skeleton height="0.875rem" width="45%" />
                <app-skeleton height="2.5rem" width="100%" />
              </div>
            }
          } @else if (emPreparo().length === 0) {
            <div class="coluna__vazia">
              <span>Nenhum item em preparo</span>
            </div>
          } @else {
            @for (item of emPreparo(); track item.id) {
              <div class="item-card item-card--preparo">
                <div class="item-card__mesa">
                  <lucide-icon name="table-2" [size]="13" />
                  Mesa {{ item.comanda.mesa?.numero ?? '—' }}
                  <span class="item-card__comanda">#{{ item.comandaId.slice(-4).toUpperCase() }}</span>
                </div>
                <div class="item-card__nome">{{ item.produto?.nome ?? 'Produto' }}</div>
                <div class="item-card__detalhes">
                  <span class="item-card__qtd">{{ item.quantidade }}x</span>
                  @if (item.observacao) {
                    <span class="item-card__obs">
                      <lucide-icon name="message-square" [size]="12" />
                      {{ item.observacao }}
                    </span>
                  }
                </div>
                <div class="item-card__tempo item-card__tempo--preparo">
                  <lucide-icon name="timer" [size]="12" />
                  {{ tempoEspera(item.criadoEm) }}
                </div>
                <button
                  class="item-card__btn btn-pronto"
                  [disabled]="processando().has(item.id)"
                  (click)="marcarPronto(item)"
                >
                  @if (processando().has(item.id)) {
                    <lucide-icon name="loader-2" [size]="16" class="spin" />
                  } @else {
                    <lucide-icon name="check" [size]="16" />
                    Marcar pronto
                  }
                </button>
              </div>
            }
          }
        </section>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      background-color: var(--b-bg);
      font-family: var(--b-font-sans);
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-4) var(--b-space-6);
      background-color: var(--b-bg-elevated);
      border-bottom: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
    }

    .header__left {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
    }

    .header__title {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      margin: 0;
    }

    .header__right {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
    }

    .header__clock {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg-muted);
      font-family: monospace;
    }

    .btn-reload {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-neutral-200);
      background-color: transparent;
      color: var(--b-fg-muted);
      cursor: pointer;

      &:hover:not(:disabled) { background-color: var(--b-bg-sunken); color: var(--b-fg); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    /* ===== COUNTERS ===== */
    .counters {
      display: flex;
      gap: var(--b-space-4);
      padding: var(--b-space-4) var(--b-space-6);
      background-color: var(--b-bg-sunken);
      border-bottom: 1px solid var(--b-neutral-100);
    }

    .counter {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-2) var(--b-space-4);
      border-radius: var(--b-radius-md);
      border: 1.5px solid transparent;
    }

    .counter--pendente {
      background-color: var(--b-warning-50);
      border-color: var(--b-warning-200);
    }

    .counter--preparo {
      background-color: var(--b-primary-50);
      border-color: var(--b-primary-200);
    }

    .counter__num {
      font-size: var(--b-font-size-3xl);
      font-weight: var(--b-font-weight-extrabold);
      line-height: 1;
      color: var(--b-fg);
    }

    .counter__label {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-muted);
    }

    .counter--pendente .counter__label { color: var(--b-warning-700); }
    .counter--preparo  .counter__label { color: var(--b-primary-600); }

    /* ===== BOARD ===== */
    .board {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--b-space-4);
      padding: var(--b-space-4);
      align-items: start;
      overflow-y: auto;
    }

    @media (min-width: 768px) {
      .board {
        grid-template-columns: 1fr 1fr;
        padding: var(--b-space-6);
        gap: var(--b-space-6);
      }
    }

    /* ===== COLUNA ===== */
    .coluna {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-3);
    }

    .coluna__titulo {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      margin: 0;
      padding-bottom: var(--b-space-2);
      border-bottom: 2px solid transparent;

      &--pendente {
        color: var(--b-warning-700);
        border-color: var(--b-warning-400);
      }

      &--preparo {
        color: var(--b-primary-600);
        border-color: var(--b-primary-400);
      }
    }

    .coluna__vazia {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-10) var(--b-space-4);
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-subtle);
      text-align: center;
    }

    /* ===== ITEM CARD ===== */
    .item-card {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 2px solid var(--b-neutral-200);
      box-shadow: var(--b-shadow-1);
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);

      &--pendente {
        border-color: var(--b-warning-300);
        background-color: var(--b-warning-50);
      }

      &--preparo {
        border-color: var(--b-primary-300);
        background-color: var(--b-primary-50);
      }

      &--skeleton {
        gap: var(--b-space-3);
        border-color: var(--b-neutral-200);
        background-color: var(--b-bg-elevated);
      }
    }

    .item-card__mesa {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-muted);
    }

    .item-card__comanda {
      margin-left: var(--b-space-1);
      font-family: monospace;
      color: var(--b-fg-subtle);
    }

    .item-card__nome {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      line-height: var(--b-line-height-tight);
    }

    .item-card__detalhes {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      flex-wrap: wrap;
    }

    .item-card__qtd {
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg-muted);
    }

    .item-card__obs {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      font-style: italic;
    }

    .item-card__tempo {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-subtle);

      &--preparo {
        color: var(--b-warning-600);
        font-weight: var(--b-font-weight-semibold);
      }
    }

    .item-card__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      width: 100%;
      min-height: 48px;
      border-radius: var(--b-radius-sm);
      border: none;
      font-family: var(--b-font-sans);
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      cursor: pointer;
      margin-top: var(--b-space-1);
      transition: opacity 0.15s ease;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-iniciar {
      background-color: var(--b-warning-500);
      color: #fff;

      &:hover:not(:disabled) { background-color: var(--b-warning-600); }
    }

    .btn-pronto {
      background-color: var(--b-success-500);
      color: #fff;

      &:hover:not(:disabled) { background-color: var(--b-success-600); }
    }

    /* ===== ANIMAÇÕES ===== */
    .spin { animation: spin 1s linear infinite; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class FilaComponent implements OnInit, OnDestroy {
  private readonly cozinhaService = inject(CozinhaService);
  private readonly socketService = inject(SocketService);
  private readonly toast = inject(ToastService);

  private subs: Subscription[] = [];
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly skeletons = Array.from({ length: 3 }, (_, i) => i);
  protected readonly horaAtual = signal(this.formatarHora());
  protected readonly processando = signal<Set<string>>(new Set());

  protected readonly fila = resource({
    loader: () => this.cozinhaService.listarFila(),
  });

  protected readonly itens = computed(() => this.fila.value() ?? []);
  protected readonly pendentes = computed(() =>
    this.itens().filter(i => i.status === 'pendente')
  );
  protected readonly emPreparo = computed(() =>
    this.itens().filter(i => i.status === 'em_preparo')
  );

  ngOnInit(): void {
    // Atualiza relógio a cada segundo
    this.clockInterval = setInterval(() => {
      this.horaAtual.set(this.formatarHora());
    }, 1000);

    // WS: novos itens entram na fila
    this.subs.push(
      this.socketService.on<unknown>('item:novo').subscribe(() => {
        this.fila.reload();
      }),
      // WS: atualização de status — recarrega para manter consistência
      this.socketService.on<unknown>('item:atualizado').subscribe(() => {
        this.fila.reload();
      }),
      // WS: item cancelado — remove da fila
      this.socketService.on<unknown>('item:cancelado').subscribe(() => {
        this.fila.reload();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  protected async iniciarPreparo(item: ItemFila): Promise<void> {
    if (this.processando().has(item.id)) return;
    this.setProcessando(item.id, true);
    try {
      await this.cozinhaService.marcarEmPreparo(item.comandaId, item.id);
      this.fila.reload();
    } catch {
      this.toast.danger('Erro ao atualizar item. Tente novamente.');
    } finally {
      this.setProcessando(item.id, false);
    }
  }

  protected async marcarPronto(item: ItemFila): Promise<void> {
    if (this.processando().has(item.id)) return;
    this.setProcessando(item.id, true);
    try {
      await this.cozinhaService.marcarPronto(item.comandaId, item.id);
      this.toast.success(`${item.produto?.nome ?? 'Item'} marcado como pronto!`);
      this.fila.reload();
    } catch {
      this.toast.danger('Erro ao atualizar item. Tente novamente.');
    } finally {
      this.setProcessando(item.id, false);
    }
  }

  protected tempoEspera(criadoEm: string): string {
    const diff = Math.floor((Date.now() - new Date(criadoEm).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    const min = Math.floor(diff / 60);
    const seg = diff % 60;
    return seg > 0 ? `${min}m ${seg}s` : `${min}m`;
  }

  private setProcessando(itemId: string, ativo: boolean): void {
    this.processando.update(set => {
      const next = new Set(set);
      if (ativo) { next.add(itemId); } else { next.delete(itemId); }
      return next;
    });
  }

  private formatarHora(): string {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

}
