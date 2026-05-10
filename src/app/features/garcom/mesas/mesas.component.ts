import { Component, inject, OnInit, OnDestroy, resource } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Mesa } from '../../../shared/types';
import { GarcomService } from '../garcom.service';
import { SocketService } from '../../../core/socket/socket.service';
import { currentUser } from '../../../core/auth/auth.signal';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { NotificacaoBannerComponent } from '../notificacao/notificacao-banner.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [SkeletonComponent, ConnectionBannerComponent, NotificacaoBannerComponent, LucideAngularModule],
  template: `
    <div class="layout">
      <app-connection-banner />
      <app-notificacao-banner />

      <header class="header">
        <div class="header__info">
          <h1 class="header__title">Mesas</h1>
          @if (currentUser()) {
            <span class="header__user">
              <lucide-icon name="user" [size]="14" />
              <span class="header__user-name">{{ currentUser()!.nome }}</span>
            </span>
          }
        </div>
        <div class="header__counts">
          @if (!mesas.isLoading() && mesas.value()) {
            <span class="badge badge--ocupada">
              {{ mesasOcupadas() }} ocupadas
            </span>
            <span class="badge badge--livre">
              {{ mesasLivres() }} livres
            </span>
          }
        </div>
      </header>

      <main class="content">
        @if (mesas.isLoading()) {
          <div class="grid">
            @for (i of skeletonItems; track i) {
              <div class="card card--skeleton">
                <app-skeleton height="1.5rem" width="60%" />
                <app-skeleton height="1rem" width="40%" radius="var(--b-radius-xs)" />
                <app-skeleton height="2rem" width="80%" />
              </div>
            }
          </div>
        } @else if (mesas.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="48" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Erro ao carregar mesas</p>
            <p class="empty-state__sub">Verifique a conexão e tente novamente</p>
            <button class="b-btn-secondary" (click)="recarregar()">
              <lucide-icon name="refresh-cw" [size]="16" />
              Tentar novamente
            </button>
          </div>
        } @else if (!mesas.value()?.length) {
          <div class="empty-state">
            <lucide-icon name="layout-grid" [size]="48" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Nenhuma mesa cadastrada</p>
            <p class="empty-state__sub">Peça ao administrador para cadastrar as mesas</p>
          </div>
        } @else {
          <div class="grid">
            @for (mesa of mesas.value(); track mesa.id) {
              <button
                class="card"
                [class.card--ocupada]="mesa.status === 'ocupada'"
                [class.card--livre]="mesa.status === 'livre'"
                [class.card--item-pronto]="mesa.status === 'item_pronto'"
                (click)="navegarParaMesa(mesa)"
                [attr.aria-label]="'Mesa ' + mesa.numero + ', ' + statusLabel(mesa.status)"
              >
                <div class="card__number">{{ mesa.numero }}</div>
                @if (mesa.descricao) {
                  <div class="card__desc">{{ mesa.descricao }}</div>
                }
                <div class="card__status">
                  <lucide-icon [name]="statusIcon(mesa.status)" [size]="16" />
                  <span>{{ statusLabel(mesa.status) }}</span>
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

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-4) var(--b-space-4);
      background-color: var(--b-bg-elevated);
      border-bottom: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      gap: var(--b-space-3);
    }

    .header__info {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-1);
      flex: 1;
      min-width: 0;
    }

    .header__title {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
      line-height: var(--b-line-height-tight);
    }

    .header__user {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
      font-weight: var(--b-font-weight-medium);
      min-width: 0;
      max-width: 100%;
    }

    .header__user-name {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .header__counts {
      display: flex;
      gap: var(--b-space-2);
      flex-shrink: 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: var(--b-space-1) var(--b-space-2);
      border-radius: var(--b-radius-sm);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      line-height: 1;
    }

    .badge--ocupada {
      background-color: var(--b-primary-100);
      color: var(--b-primary-700);
    }

    .badge--livre {
      background-color: var(--b-neutral-100);
      color: var(--b-neutral-700);
    }

    /* Content */
    .content {
      flex: 1;
      padding: var(--b-space-4);
    }

    /* Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--b-space-3);
    }

    @media (min-width: 480px) {
      .grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    @media (min-width: 768px) {
      .content {
        padding: var(--b-space-6);
      }

      .grid {
        grid-template-columns: repeat(5, 1fr);
        gap: var(--b-space-4);
      }
    }

    @media (min-width: 1024px) {
      .grid {
        grid-template-columns: repeat(6, 1fr);
      }
    }

    /* Mesa card */
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      min-height: 96px;
      padding: var(--b-space-3);
      border-radius: var(--b-radius-md);
      border: 2px solid var(--b-neutral-200);
      background-color: var(--b-bg-elevated);
      cursor: pointer;
      text-align: center;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      font-family: var(--b-font-sans);

      /* touch target */
      min-width: 44px;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--b-shadow-2);
      }

      &:active {
        transform: translateY(0);
      }

      &--livre {
        border-color: var(--b-neutral-200);
        background-color: var(--b-bg-elevated);
      }

      &--ocupada {
        border-color: var(--b-primary-400);
        background-color: var(--b-primary-50);
      }

      &--item-pronto {
        border-color: var(--b-success-500);
        background-color: var(--b-success-50);
        animation: pulse-accent 1.5s ease-in-out infinite;
      }

      &--skeleton {
        cursor: default;
        gap: var(--b-space-3);
        padding: var(--b-space-4);
        animation: none;

        &:hover {
          transform: none;
          box-shadow: none;
        }
      }
    }

    .card__number {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      line-height: 1;
    }

    .card--ocupada .card__number {
      color: var(--b-primary-600);
    }

    .card--item-pronto .card__number {
      color: var(--b-success-600);
    }

    .card__desc {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-subtle);
      font-weight: var(--b-font-weight-medium);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .card__status {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-muted);
    }

    .card--ocupada .card__status {
      color: var(--b-primary-600);
    }

    .card--item-pronto .card__status {
      color: var(--b-success-700);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-3);
      padding: var(--b-space-12) var(--b-space-4);
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

    /* Pulse animation for item_pronto */
    @keyframes pulse-accent {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--b-success-500) 40%, transparent); }
      50%       { box-shadow: 0 0 0 6px color-mix(in srgb, var(--b-success-500) 0%, transparent); }
    }
  `],
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly garcomService = inject(GarcomService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly currentUser = currentUser;

  protected readonly skeletonItems = Array.from({ length: 9 }, (_, i) => i);

  private subs: Subscription[] = [];

  protected readonly mesas = resource({
    loader: () => this.garcomService.listarMesas(),
  });

  protected readonly mesasOcupadas = () => {
    const lista = this.mesas.value() ?? [];
    return lista.filter(m => m.status === 'ocupada' || m.status === 'item_pronto').length;
  };

  protected readonly mesasLivres = () => {
    const lista = this.mesas.value() ?? [];
    return lista.filter(m => m.status === 'livre').length;
  };

  ngOnInit(): void {
    this.subs.push(
      this.socketService.on<unknown>('comanda:aberta').subscribe(() => {
        this.mesas.reload();
      }),
      this.socketService.on<unknown>('comanda:fechada').subscribe(() => {
        this.mesas.reload();
      }),
      this.socketService.on<unknown>('item:atualizado').subscribe(() => {
        this.mesas.reload();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  protected navegarParaMesa(mesa: Mesa): void {
    this.router.navigate(['/garcom/mesa', mesa.id, 'comandas']);
  }

  protected recarregar(): void {
    this.mesas.reload();
  }

  protected statusLabel(status: Mesa['status']): string {
    const labels: Record<Mesa['status'], string> = {
      livre: 'livre',
      ocupada: 'ocupada',
      item_pronto: 'item pronto',
    };
    return labels[status];
  }

  protected statusIcon(status: Mesa['status']): string {
    const icons: Record<Mesa['status'], string> = {
      livre: 'circle',
      ocupada: 'users',
      item_pronto: 'bell',
    };
    return icons[status];
  }

}
