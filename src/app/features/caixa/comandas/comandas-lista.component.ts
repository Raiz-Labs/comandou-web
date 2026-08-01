import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  resource,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Comanda } from '../../../shared/types';
import { CaixaService } from '../caixa.service';
import { SocketService } from '../../../core/socket/socket.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

type Ordenacao = 'mesa' | 'tempo' | 'total';

@Component({
  selector: 'app-comandas-lista',
  standalone: true,
  imports: [SkeletonComponent, ConnectionBannerComponent, CurrencyBrPipe, LucideAngularModule],
  template: `
    <div class="layout">
      <app-connection-banner />

      <header class="header">
        <div class="header__top">
          <div class="header__info">
            <h1 class="header__title">
              <lucide-icon name="receipt" [size]="22" color="var(--b-primary-500)" />
              Caixa
            </h1>
            @if (!comandas.isLoading() && comandas.hasValue()) {
              <span class="header__badge">
                {{ comandasAbertas().length }} aberta{{ comandasAbertas().length !== 1 ? 's' : '' }}
              </span>
            }
          </div>

          <!-- Busca por mesa -->
          <div class="search-box">
            <lucide-icon name="search" [size]="16" color="var(--b-fg-subtle)" />
            <input
              class="search-input"
              type="search"
              placeholder="Buscar por mesa..."
              [value]="busca()"
              (input)="setBusca($event)"
              autocomplete="off"
            />
            @if (busca()) {
              <button class="search-clear" (click)="busca.set('')" aria-label="Limpar busca">
                <lucide-icon name="x" [size]="14" />
              </button>
            }
          </div>
        </div>

        <!-- Ordenação -->
        <div class="sort-tabs">
          <button
            class="sort-tab"
            [class.sort-tab--active]="ordenacao() === 'mesa'"
            (click)="ordenacao.set('mesa')"
          >
            <lucide-icon name="layout-grid" [size]="13" />
            Mesa
          </button>
          <button
            class="sort-tab"
            [class.sort-tab--active]="ordenacao() === 'tempo'"
            (click)="ordenacao.set('tempo')"
          >
            <lucide-icon name="clock" [size]="13" />
            Mais antiga
          </button>
          <button
            class="sort-tab"
            [class.sort-tab--active]="ordenacao() === 'total'"
            (click)="ordenacao.set('total')"
          >
            <lucide-icon name="trending-up" [size]="13" />
            Maior total
          </button>
        </div>
      </header>

      <main class="content">
        @if (comandas.isLoading()) {
          <div class="grid">
            @for (i of skeletons; track i) {
              <div class="comanda-card comanda-card--skeleton">
                <app-skeleton height="1.5rem" width="80px" />
                <app-skeleton height="1rem" width="120px" />
                <app-skeleton height="1.75rem" width="100px" />
                <app-skeleton height="2.5rem" width="100%" />
              </div>
            }
          </div>
        } @else if (comandas.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="48" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Erro ao carregar comandas</p>
            <button class="b-btn-secondary" (click)="comandas.reload()">
              <lucide-icon name="refresh-cw" [size]="16" />
              Tentar novamente
            </button>
          </div>
        } @else if (comandasFiltradas().length === 0) {
          <div class="empty-state">
            @if (busca()) {
              <lucide-icon name="search-x" [size]="48" color="var(--b-fg-subtle)" />
              <p class="empty-state__title">Nenhuma comanda encontrada</p>
              <p class="empty-state__sub">Tente buscar por outro número de mesa</p>
            } @else {
              <lucide-icon name="check-circle-2" [size]="48" color="var(--b-success-500)" />
              <p class="empty-state__title">Nenhuma comanda aberta</p>
              <p class="empty-state__sub">Todas as mesas estão livres</p>
            }
          </div>
        } @else {
          <div class="grid">
            @for (comanda of comandasFiltradas(); track comanda.id) {
              <button class="comanda-card" (click)="abrirComanda(comanda)">
                <div class="comanda-card__mesa">
                  Mesa {{ comanda.mesa?.numero ?? '—' }}
                </div>
                <div class="comanda-card__meta">
                  <span class="comanda-card__id">#{{ comanda.id.slice(-6).toUpperCase() }}</span>
                  <span class="comanda-card__tempo">
                    <lucide-icon name="clock" [size]="12" />
                    {{ tempoAberta(comanda.criadoEm) }}
                  </span>
                </div>
                <div class="comanda-card__itens">
                  <span class="comanda-card__count">
                    <lucide-icon name="package" [size]="13" />
                    {{ itensAtivos(comanda) }} iten{{ itensAtivos(comanda) !== 1 ? 's' : '' }}
                  </span>
                  @if (temItemPronto(comanda)) {
                    <span class="comanda-card__pronto">
                      <lucide-icon name="bell" [size]="12" />
                      item pronto
                    </span>
                  }
                </div>
                <div class="comanda-card__total">
                  {{ comanda.total | currencyBr }}
                </div>
                <div class="comanda-card__action">
                  <lucide-icon name="chevron-right" [size]="18" color="var(--b-fg-subtle)" />
                </div>
              </button>
            }
          </div>
        }
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
      background-color: var(--b-bg-elevated);
      border-bottom: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      padding: var(--b-space-4) var(--b-space-4) 0;

      @media (min-width: 768px) {
        padding: var(--b-space-5) var(--b-space-6) 0;
      }
    }

    .header__top {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-3);
      padding-bottom: var(--b-space-4);

      @media (min-width: 768px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .header__info {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
    }

    .header__title {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      margin: 0;
    }

    .header__badge {
      padding: var(--b-space-1) var(--b-space-3);
      background-color: var(--b-primary-100);
      color: var(--b-primary-700);
      border-radius: var(--b-radius-sm);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-bold);
    }

    /* Busca */
    .search-box {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-3);
      background-color: var(--b-bg-sunken);
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-neutral-200);

      @media (min-width: 768px) {
        width: 280px;
      }
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: var(--b-font-size-sm);
      color: var(--b-fg);
      outline: none;
      font-family: var(--b-font-sans);

      &::placeholder { color: var(--b-fg-subtle); }
    }

    .search-clear {
      display: flex;
      align-items: center;
      border: none;
      background: transparent;
      color: var(--b-fg-muted);
      cursor: pointer;
      padding: 2px;

      &:hover { color: var(--b-fg); }
    }

    /* Ordenação tabs */
    .sort-tabs {
      display: flex;
      gap: 0;
      border-top: 1px solid var(--b-neutral-100);
    }

    .sort-tab {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      padding: var(--b-space-2) var(--b-space-4);
      border: none;
      border-bottom: 2px solid transparent;
      background-color: transparent;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      cursor: pointer;
      font-family: var(--b-font-sans);
      min-height: 44px;
      transition: color 0.1s;

      &:hover { color: var(--b-fg); }

      &--active {
        color: var(--b-primary-600);
        border-bottom-color: var(--b-primary-500);
        font-weight: var(--b-font-weight-bold);
      }
    }

    /* ===== CONTENT ===== */
    .content {
      flex: 1;
      padding: var(--b-space-4);

      @media (min-width: 768px) {
        padding: var(--b-space-6);
      }
    }

    /* ===== GRID ===== */
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--b-space-3);

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, 1fr);
        gap: var(--b-space-4);
      }

      @media (min-width: 1280px) {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    /* ===== COMANDA CARD ===== */
    .comanda-card {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
      padding: var(--b-space-4) var(--b-space-4) var(--b-space-3);
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1.5px solid var(--b-neutral-200);
      box-shadow: var(--b-shadow-1);
      cursor: pointer;
      text-align: left;
      font-family: var(--b-font-sans);
      position: relative;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--b-shadow-2);
        border-color: var(--b-primary-300);
      }

      &:active { transform: translateY(0); }

      &--skeleton {
        cursor: default;
        gap: var(--b-space-3);

        &:hover { transform: none; box-shadow: var(--b-shadow-1); border-color: var(--b-neutral-200); }
      }
    }

    .comanda-card__mesa {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      line-height: 1;
    }

    .comanda-card__meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .comanda-card__id {
      font-family: monospace;
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-subtle);
      font-weight: var(--b-font-weight-semibold);
    }

    .comanda-card__tempo {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
    }

    .comanda-card__itens {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
    }

    .comanda-card__count {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
    }

    .comanda-card__pronto {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-success-600);
      background-color: var(--b-success-50);
      padding: 2px var(--b-space-2);
      border-radius: var(--b-radius-sm);
    }

    .comanda-card__total {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
      margin-top: var(--b-space-1);
    }

    .comanda-card__action {
      position: absolute;
      right: var(--b-space-3);
      top: 50%;
      transform: translateY(-50%);
    }

    /* ===== EMPTY STATE ===== */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-3);
      padding: var(--b-space-16) var(--b-space-4);
      text-align: center;
    }

    .empty-state__title {
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
      margin: 0;
    }

    .empty-state__sub {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      margin: 0;
    }
  `],
})
export class ComandasListaComponent implements OnInit, OnDestroy {
  private readonly caixaService = inject(CaixaService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);

  private subs: Subscription[] = [];

  protected readonly skeletons = Array.from({ length: 6 }, (_, i) => i);
  protected readonly busca = signal('');
  protected readonly ordenacao = signal<Ordenacao>('mesa');

  protected readonly comandas = resource({
    loader: () => this.caixaService.listarComandasAbertas(),
  });

  protected readonly comandasAbertas = computed(() => (this.comandas.hasValue() ? this.comandas.value() : []));

  protected readonly comandasFiltradas = computed(() => {
    const lista = this.comandasAbertas();
    const q = this.busca().toLowerCase().trim();
    const ord = this.ordenacao();

    const filtradas = q
      ? lista.filter(c =>
          String(c.mesa?.numero ?? '').includes(q) ||
          c.id.toLowerCase().includes(q)
        )
      : lista;

    return [...filtradas].sort((a, b) => {
      if (ord === 'mesa') return (a.mesa?.numero ?? 0) - (b.mesa?.numero ?? 0);
      if (ord === 'tempo') return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
      if (ord === 'total') return b.total - a.total;
      return 0;
    });
  });

  ngOnInit(): void {
    this.subs.push(
      this.socketService.on<unknown>('comanda:aberta').subscribe(() => {
        this.comandas.reload();
      }),
      this.socketService.on<unknown>('comanda:fechada').subscribe(() => {
        this.comandas.reload();
      }),
      this.socketService.on<unknown>('item:atualizado').subscribe(() => {
        this.comandas.reload();
      }),
    );

  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  protected abrirComanda(comanda: Comanda): void {
    this.router.navigate(['/caixa/comanda', comanda.id]);
  }

  protected setBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }

  protected itensAtivos(comanda: Comanda): number {
    return comanda.itens.filter(i => i.status !== 'cancelado').length;
  }

  protected temItemPronto(comanda: Comanda): boolean {
    return comanda.itens.some(i => i.status === 'pronto');
  }

  protected tempoAberta(criadoEm: string): string {
    const diff = Math.floor((Date.now() - new Date(criadoEm).getTime()) / 60000);
    if (diff < 60) return `${diff}min`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

}
