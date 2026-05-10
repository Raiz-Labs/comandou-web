import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  resource,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Comanda } from '../../../shared/types';
import { GarcomService } from '../garcom.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { NotificacaoBannerComponent } from '../notificacao/notificacao-banner.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-mesa-comandas',
  standalone: true,
  imports: [SkeletonComponent, ConnectionBannerComponent, NotificacaoBannerComponent, CurrencyBrPipe, LucideAngularModule, FormsModule],
  template: `
    <div class="layout">
      <app-connection-banner />
      <app-notificacao-banner />

      <header class="header">
        <button class="b-btn-back" (click)="voltar()" aria-label="Voltar para mesas">
          <lucide-icon name="arrow-left" [size]="20" />
        </button>

        @if (dados.isLoading()) {
          <div class="header__info">
            <app-skeleton height="1.25rem" width="120px" />
            <app-skeleton height="1rem" width="80px" />
          </div>
        } @else if (dados.value()) {
          <div class="header__info">
            <h1 class="header__title">Mesa {{ dados.value()!.mesa.numero }}</h1>
            @if (dados.value()!.mesa.descricao) {
              <span class="header__sub">{{ dados.value()!.mesa.descricao }}</span>
            }
          </div>
          <div
            class="status-badge"
            [class.status-badge--ocupada]="dados.value()!.mesa.status === 'ocupada'"
            [class.status-badge--item-pronto]="dados.value()!.mesa.status === 'item_pronto'"
          >
            {{ statusMesaLabel(dados.value()!.mesa.status) }}
          </div>
        }
      </header>

      <main class="content">
        @if (dados.isLoading()) {
          <div class="section">
            <div class="section__header">
              <app-skeleton height="1rem" width="140px" />
            </div>
            @for (i of skeletonItems; track i) {
              <div class="comanda-card comanda-card--skeleton">
                <app-skeleton height="1.125rem" width="50%" />
                <app-skeleton height="0.875rem" width="70%" />
                <app-skeleton height="1.25rem" width="35%" />
              </div>
            }
          </div>
        } @else if (dados.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Erro ao carregar comandas</p>
            <button class="b-btn-secondary" (click)="dados.reload()">
              <lucide-icon name="refresh-cw" [size]="16" />
              Tentar novamente
            </button>
          </div>
        } @else {
          <!-- Comandas abertas -->
          @if (comandasAbertas().length > 0) {
            <section class="section">
              <h2 class="section__title">
                <lucide-icon name="file-text" [size]="16" />
                Comandas abertas
              </h2>
              @for (comanda of comandasAbertas(); track comanda.id) {
                <button class="comanda-card" (click)="abrirDetalhe(comanda)">
                  <div class="comanda-card__top">
                    <span class="comanda-card__id">
                      @if (comanda.nomeCliente) {
                        <lucide-icon name="user" [size]="13" />
                        {{ comanda.nomeCliente }}
                      } @else {
                        #{{ comanda.id.slice(-6).toUpperCase() }}
                      }
                    </span>
                    <span class="comanda-card__total">{{ comanda.total | currencyBr }}</span>
                  </div>
                  <div class="comanda-card__bottom">
                    <span class="comanda-card__itens">
                      <lucide-icon name="package" [size]="13" />
                      {{ comanda.itens.length }} {{ comanda.itens.length === 1 ? 'item' : 'itens' }}
                    </span>
                    <span class="comanda-card__aberta">
                      <lucide-icon name="circle-dot" [size]="13" />
                      aberta
                    </span>
                  </div>
                </button>
              }
            </section>
          } @else {
            <div class="empty-comandas">
              <lucide-icon name="clipboard-list" [size]="40" color="var(--b-fg-subtle)" />
              <p class="empty-comandas__text">Nenhuma comanda aberta nesta mesa</p>
            </div>
          }

          <!-- Comandas fechadas (histórico) -->
          @if (comandasFechadas().length > 0) {
            <section class="section section--muted">
              <h2 class="section__title section__title--muted">
                <lucide-icon name="check-circle-2" [size]="16" />
                Fechadas hoje
              </h2>
              @for (comanda of comandasFechadas(); track comanda.id) {
                <div class="comanda-card comanda-card--fechada">
                  <div class="comanda-card__top">
                    <span class="comanda-card__id">#{{ comanda.id.slice(-6).toUpperCase() }}</span>
                    <span class="comanda-card__total">{{ comanda.total | currencyBr }}</span>
                  </div>
                  <div class="comanda-card__bottom">
                    <span class="comanda-card__itens">
                      <lucide-icon name="package" [size]="13" />
                      {{ comanda.itens.length }} {{ comanda.itens.length === 1 ? 'item' : 'itens' }}
                    </span>
                    <span class="comanda-card__fechada">
                      <lucide-icon name="check-circle-2" [size]="13" />
                      fechada
                    </span>
                  </div>
                </div>
              }
            </section>
          }
        }
      </main>

      <!-- FAB: abrir nova comanda -->
      <div class="fab-area">
        <button
          class="b-btn-primary fab"
          [disabled]="abrindo()"
          (click)="abrirModalNome()"
          aria-label="Abrir nova comanda"
        >
          @if (abrindo()) {
            <lucide-icon name="loader-2" [size]="20" class="b-spin" />
            Abrindo...
          } @else {
            <lucide-icon name="plus" [size]="20" />
            Nova comanda
          }
        </button>
      </div>

      <!-- Modal: nome do cliente -->
      @if (modalNomeAberto()) {
        <div class="modal-backdrop" (click)="fecharModalNome()"></div>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
          <div class="modal__header">
            <h2 class="modal__titulo" id="modal-titulo">Nova comanda</h2>
            <button class="modal__fechar" (click)="fecharModalNome()" aria-label="Fechar">
              <lucide-icon name="x" [size]="20" />
            </button>
          </div>
          <div class="modal__body">
            <p class="modal__desc">Em qual nome está a comanda? (opcional)</p>
            <div class="campo">
              <label class="b-label" for="nome-cliente">Nome do cliente</label>
              <input
                id="nome-cliente"
                class="b-input"
                type="text"
                [(ngModel)]="nomeClienteInput"
                placeholder="Ex: João, Mesa do fundo..."
                maxlength="100"
                (keydown.enter)="confirmarAbertura()"
                autofocus
              />
            </div>
          </div>
          <div class="modal__acoes">
            <button class="b-btn-ghost" (click)="fecharModalNome()">Cancelar</button>
            <button class="b-btn-primary" (click)="confirmarAbertura()" [disabled]="abrindo()">
              @if (abrindo()) {
                <lucide-icon name="loader-2" [size]="16" class="b-spin" />
                Abrindo...
              } @else {
                Abrir comanda
              }
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      background-color: var(--b-bg);
      font-family: var(--b-font-sans);
      padding-bottom: 88px; /* espaço para o FAB */
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-3) var(--b-space-4);
      background-color: var(--b-bg-elevated);
      border-bottom: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      min-height: 64px;
    }

    .header__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .header__title {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
      line-height: var(--b-line-height-tight);
    }

    .header__sub {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
    }

    .status-badge {
      flex-shrink: 0;
      padding: var(--b-space-1) var(--b-space-3);
      border-radius: var(--b-radius-sm);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      background-color: var(--b-neutral-100);
      color: var(--b-neutral-700);

      &--ocupada {
        background-color: var(--b-primary-100);
        color: var(--b-primary-700);
      }

      &--item-pronto {
        background-color: var(--b-success-100);
        color: var(--b-success-700);
      }
    }

    /* Content */
    .content {
      flex: 1;
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-5);
    }

    /* Section */
    .section {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-3);
    }

    .section__title {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
      margin: 0;

      &--muted {
        color: var(--b-fg-muted);
      }
    }

    /* Comanda card */
    .comanda-card {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
      padding: var(--b-space-4);
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 2px solid var(--b-primary-200);
      box-shadow: var(--b-shadow-1);
      cursor: pointer;
      text-align: left;
      font-family: var(--b-font-sans);
      width: 100%;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--b-shadow-2);
      }

      &:active {
        transform: translateY(0);
      }

      &--fechada {
        cursor: default;
        border-color: var(--b-neutral-200);
        background-color: var(--b-bg-sunken);
        opacity: 0.75;

        &:hover {
          transform: none;
          box-shadow: var(--b-shadow-1);
        }
      }

      &--skeleton {
        cursor: default;
        gap: var(--b-space-3);
        border-color: var(--b-neutral-200);

        &:hover {
          transform: none;
          box-shadow: var(--b-shadow-1);
        }
      }
    }

    .comanda-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .comanda-card__id {
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      font-family: monospace;
    }

    .comanda-card--fechada .comanda-card__id {
      color: var(--b-fg-muted);
    }

    .comanda-card__total {
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
    }

    .comanda-card--fechada .comanda-card__total {
      color: var(--b-fg-muted);
    }

    .comanda-card__bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .comanda-card__itens,
    .comanda-card__aberta,
    .comanda-card__fechada {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
    }

    .comanda-card__aberta {
      color: var(--b-success-600);
    }

    /* Empty states */
    .empty-state,
    .empty-comandas {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-3);
      padding: var(--b-space-10) var(--b-space-4);
      text-align: center;
    }

    .empty-comandas__text {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      margin: 0;
    }

    .empty-state__title {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
      margin: 0;
    }

    /* FAB */
    .fab-area {
      position: fixed;
      bottom: var(--b-space-5);
      left: var(--b-space-4);
      right: var(--b-space-4);
      display: flex;
      justify-content: center;
    }

    .fab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      width: 100%;
      max-width: 400px;
      min-height: 52px;
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      box-shadow: var(--b-shadow-3);

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    /* Modal nome do cliente */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(44, 26, 14, 0.45);
      backdrop-filter: blur(2px);
      z-index: 300;
    }

    .modal {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: calc(100% - var(--b-space-8));
      max-width: 400px;
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-lg);
      box-shadow: var(--b-shadow-4);
      z-index: 301;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-5) var(--b-space-5) var(--b-space-3);
    }

    .modal__titulo {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
    }

    .modal__fechar {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border: none;
      background: transparent;
      color: var(--b-fg-muted);
      border-radius: var(--b-radius-sm);
      cursor: pointer;
      &:hover { background-color: var(--b-bg-sunken); }
    }

    .modal__body {
      padding: 0 var(--b-space-5) var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-3);
    }

    .modal__desc {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      margin: 0;
    }

    .campo {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
    }

    .modal__acoes {
      display: flex;
      justify-content: flex-end;
      gap: var(--b-space-3);
      padding: var(--b-space-4) var(--b-space-5);
      border-top: 1px solid var(--b-neutral-100);
    }

    .modal__acoes button {
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
    }

  `],
})
export class MesaComandasComponent implements OnInit, OnDestroy {
  private readonly garcomService = inject(GarcomService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  private readonly mesaId = this.route.snapshot.params['mesaId'] as string;
  private subs: Subscription[] = [];

  protected readonly skeletonItems = Array.from({ length: 2 }, (_, i) => i);
  protected readonly abrindo = signal(false);
  protected readonly modalNomeAberto = signal(false);
  protected nomeClienteInput = '';

  protected readonly dados = resource({
    loader: () =>
      Promise.all([
        this.garcomService.buscarMesa(this.mesaId),
        this.garcomService.listarComandasDaMesa(this.mesaId),
      ]).then(([mesa, comandas]) => ({ mesa, comandas })),
  });

  protected readonly comandasAbertas = computed(
    () => (this.dados.value()?.comandas ?? []).filter(c => c.aberta)
  );

  protected readonly comandasFechadas = computed(
    () => (this.dados.value()?.comandas ?? []).filter(c => !c.aberta)
  );

  ngOnInit(): void {
    this.subs.push(
      this.socketService.on<unknown>('comanda:aberta').subscribe(() => {
        this.dados.reload();
      }),
      this.socketService.on<unknown>('comanda:fechada').subscribe(() => {
        this.dados.reload();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  protected voltar(): void {
    this.router.navigate(['/garcom/mesas']);
  }

  protected abrirDetalhe(comanda: Comanda): void {
    this.router.navigate(['/garcom/comanda', comanda.id]);
  }

  protected abrirModalNome(): void {
    this.nomeClienteInput = '';
    this.modalNomeAberto.set(true);
  }

  protected fecharModalNome(): void {
    this.modalNomeAberto.set(false);
    this.nomeClienteInput = '';
  }

  protected async confirmarAbertura(): Promise<void> {
    if (this.abrindo()) return;
    this.abrindo.set(true);
    try {
      const nome = this.nomeClienteInput.trim() || undefined;
      const novaComanda = await this.garcomService.abrirComanda(this.mesaId, nome);
      this.toast.success('Comanda aberta!');
      this.router.navigate(['/garcom/comanda', novaComanda.id]);
    } catch {
      this.toast.danger('Não foi possível abrir a comanda. Tente novamente.');
      this.abrindo.set(false);
    } finally {
      this.modalNomeAberto.set(false);
    }
  }

  protected statusMesaLabel(status: string): string {
    const labels: Record<string, string> = {
      livre: 'livre',
      ocupada: 'ocupada',
      item_pronto: 'item pronto',
    };
    return labels[status] ?? status;
  }

}
