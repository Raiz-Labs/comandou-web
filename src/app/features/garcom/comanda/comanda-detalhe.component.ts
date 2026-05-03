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
import { Subscription } from 'rxjs';
import { Categoria, ItemComanda, Produto, StatusItem } from '../../../shared/types';
import { GarcomService } from '../garcom.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificacaoBannerComponent } from '../notificacao/notificacao-banner.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

type UiStep = 'lista' | 'picker' | 'form' | 'edicao';

const EDITAVEL: StatusItem[] = ['pendente'];
const CANCELAVEL: StatusItem[] = ['pendente', 'em_preparo'];

interface CategoriaComProdutos extends Categoria {
  produtos: Produto[];
}

@Component({
  selector: 'app-comanda-detalhe',
  standalone: true,
  imports: [SkeletonComponent, ConnectionBannerComponent, StatusBadgeComponent, ConfirmDialogComponent, NotificacaoBannerComponent, CurrencyBrPipe, LucideAngularModule],
  template: `
    <div class="layout">
      <app-connection-banner />
      <app-notificacao-banner />

      <!-- Header -->
      <header class="header">
        <button class="btn-back" (click)="voltar()" aria-label="Voltar">
          <lucide-icon name="arrow-left" [size]="20" />
        </button>
        <div class="header__info">
          @if (comanda.isLoading()) {
            <app-skeleton height="1.25rem" width="140px" />
            <app-skeleton height="0.875rem" width="100px" />
          } @else if (comanda.value()) {
            <h1 class="header__title">
              Comanda #{{ comanda.value()!.id.slice(-6).toUpperCase() }}
            </h1>
            @if (comanda.value()!.mesa) {
              <span class="header__sub">Mesa {{ comanda.value()!.mesa!.numero }}</span>
            }
          }
        </div>
        @if (!comanda.isLoading() && comanda.value()) {
          <div class="header__total">
            {{ totalAtivo() | currencyBr }}
          </div>
        }
      </header>

      <!-- Lista de itens -->
      <main class="content">
        @if (comanda.isLoading()) {
          @for (i of skeletonItems; track i) {
            <div class="item-card item-card--skeleton">
              <app-skeleton height="1rem" width="55%" />
              <app-skeleton height="0.875rem" width="80%" />
              <app-skeleton height="1.25rem" width="40%" />
            </div>
          }
        } @else if (comanda.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Erro ao carregar comanda</p>
            <button class="b-btn-secondary" (click)="comanda.reload()">
              <lucide-icon name="refresh-cw" [size]="16" />
              Tentar novamente
            </button>
          </div>
        } @else if (itensAtivos().length === 0 && itensCancelados().length === 0) {
          <div class="empty-state">
            <lucide-icon name="shopping-bag" [size]="48" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Comanda vazia</p>
            <p class="empty-state__sub">Toque em "Adicionar item" para começar o pedido</p>
          </div>
        } @else {
          <!-- Itens ativos -->
          @for (item of itensAtivos(); track item.id) {
            <div class="item-card">
              <div class="item-card__top">
                <span class="item-card__nome">
                  {{ item.produto?.nome ?? 'Produto' }}
                </span>
                <div class="item-card__actions">
                  @if (podeEditar(item.status)) {
                    <button
                      class="item-action item-action--edit"
                      (click)="abrirEdicao(item)"
                      aria-label="Editar item"
                    >
                      <lucide-icon name="pencil" [size]="15" />
                    </button>
                  }
                  @if (podeCancelar(item.status)) {
                    <button
                      class="item-action item-action--cancel"
                      (click)="pedirCancelamento(item)"
                      aria-label="Cancelar item"
                    >
                      <lucide-icon name="x" [size]="15" />
                    </button>
                  }
                  <app-status-badge [status]="item.status" />
                </div>
              </div>
              @if (item.observacao) {
                <p class="item-card__obs">
                  <lucide-icon name="message-square" [size]="12" />
                  {{ item.observacao }}
                </p>
              }
              <div class="item-card__bottom">
                <span class="item-card__qtd">{{ item.quantidade }}x</span>
                <span class="item-card__total">{{ item.total | currencyBr }}</span>
              </div>
            </div>
          }

          <!-- Itens cancelados -->
          @if (itensCancelados().length > 0) {
            <div class="cancelados-label">
              <lucide-icon name="x-circle" [size]="13" />
              Cancelados
            </div>
            @for (item of itensCancelados(); track item.id) {
              <div class="item-card item-card--cancelado">
                <div class="item-card__top">
                  <span class="item-card__nome">{{ item.produto?.nome ?? 'Produto' }}</span>
                  <app-status-badge [status]="item.status" />
                </div>
                <div class="item-card__bottom">
                  <span class="item-card__qtd">{{ item.quantidade }}x</span>
                  <span class="item-card__total item-card__total--riscado">
                    {{ item.total | currencyBr }}
                  </span>
                </div>
              </div>
            }
          }
        }
      </main>

      <!-- FAB -->
      @if (!comanda.isLoading() && comanda.value()?.aberta) {
        <div class="fab-area">
          <button class="b-btn-primary fab" (click)="abrirPicker()">
            <lucide-icon name="plus" [size]="20" />
            Adicionar item
          </button>
        </div>
      }
    </div>

    <!-- ===== CONFIRM DIALOG: CANCELAR ITEM ===== -->
    @if (itemParaCancelar()) {
      <app-confirm-dialog
        title="Cancelar item?"
        [message]="'Deseja cancelar ' + (itemParaCancelar()!.produto?.nome ?? 'este item') + '? Esta ação não pode ser desfeita.'"
        confirmLabel="Sim, cancelar"
        cancelLabel="Voltar"
        [confirmDanger]="true"
        (confirmed)="confirmarCancelamento()"
        (cancelled)="recusarCancelamento()"
      />
    }

    <!-- ===== BOTTOM SHEET: EDITAR ITEM ===== -->
    @if (uiStep() === 'edicao') {
      <div class="sheet-backdrop" (click)="fecharEdicao()"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Editar item">
        <div class="sheet__header">
          <h2 class="sheet__title">{{ itemEmEdicao()?.produto?.nome ?? 'Editar item' }}</h2>
          <button class="sheet__close" (click)="fecharEdicao()" aria-label="Fechar">
            <lucide-icon name="x" [size]="20" />
          </button>
        </div>
        <div class="form-body">
          <div class="preco-produto">
            {{ (itemEmEdicao()?.produto?.preco ?? 0) | currencyBr }}
          </div>

          <!-- Quantidade -->
          <div class="qty-control">
            <button
              class="qty-btn"
              (click)="decrementarQtd()"
              [disabled]="quantidade() <= 1"
              aria-label="Diminuir quantidade"
            >
              <lucide-icon name="minus" [size]="18" />
            </button>
            <span class="qty-value">{{ quantidade() }}</span>
            <button class="qty-btn" (click)="incrementarQtd()" aria-label="Aumentar quantidade">
              <lucide-icon name="plus" [size]="18" />
            </button>
          </div>

          <!-- Observação -->
          <div class="obs-field">
            <label class="b-label" for="obs-edit">Observação (opcional)</label>
            <textarea
              id="obs-edit"
              class="b-input obs-input"
              placeholder="Ex: sem cebola, bem passado..."
              [value]="observacao()"
              (input)="setObservacao($event)"
              rows="3"
              maxlength="200"
            ></textarea>
          </div>

          <!-- Subtotal -->
          <div class="subtotal">
            <span class="subtotal__label">Subtotal</span>
            <span class="subtotal__valor">
              {{ (itemEmEdicao()?.produto?.preco ?? 0) * quantidade() | currencyBr }}
            </span>
          </div>

          <!-- Salvar -->
          <button
            class="b-btn-primary confirm-btn"
            [disabled]="salvando()"
            (click)="confirmarEdicao()"
          >
            @if (salvando()) {
              <lucide-icon name="loader-2" [size]="18" class="spin" />
              Salvando...
            } @else {
              <lucide-icon name="check" [size]="18" />
              Salvar alterações
            }
          </button>
        </div>
      </div>
    }

    <!-- ===== BOTTOM SHEET: PICKER DE PRODUTOS ===== -->
    @if (uiStep() === 'picker' || uiStep() === 'form') {
      <div class="sheet-backdrop" (click)="fecharPicker()"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Selecionar produto">

        @if (uiStep() === 'picker') {
          <div class="sheet__header">
            <h2 class="sheet__title">Selecionar produto</h2>
            <button class="sheet__close" (click)="fecharPicker()" aria-label="Fechar">
              <lucide-icon name="x" [size]="20" />
            </button>
          </div>

          <!-- Busca -->
          <div class="sheet__search">
            <lucide-icon name="search" [size]="16" color="var(--b-fg-subtle)" />
            <input
              class="b-input search-input"
              type="search"
              placeholder="Buscar produto..."
              [value]="busca()"
              (input)="setBusca($event)"
              autocomplete="off"
            />
          </div>

          <!-- Filtro de categorias -->
          @if (cardapio.isLoading()) {
            <div class="cat-tabs">
              @for (i of [1,2,3]; track i) {
                <app-skeleton height="32px" width="80px" radius="var(--b-radius-sm)" />
              }
            </div>
          } @else {
            <div class="cat-tabs">
              <button
                class="cat-tab"
                [class.cat-tab--active]="categoriaSelecionada() === null"
                (click)="categoriaSelecionada.set(null)"
              >
                Todos
              </button>
              @for (cat of cardapio.value()?.categorias ?? []; track cat.id) {
                <button
                  class="cat-tab"
                  [class.cat-tab--active]="categoriaSelecionada()?.id === cat.id"
                  (click)="categoriaSelecionada.set(cat)"
                >
                  {{ cat.nome }}
                </button>
              }
            </div>
          }

          <!-- Lista de produtos -->
          <div class="sheet__produtos">
            @if (cardapio.isLoading()) {
              @for (i of [1,2,3,4]; track i) {
                <div class="produto-card produto-card--skeleton">
                  <app-skeleton height="1rem" width="60%" />
                  <app-skeleton height="0.875rem" width="40%" />
                </div>
              }
            } @else if (produtosFiltrados().length === 0) {
              <div class="empty-state" style="padding: var(--b-space-8) 0">
                <p class="empty-state__sub">Nenhum produto encontrado</p>
              </div>
            } @else {
              @for (cat of categoriasFiltradas(); track cat.id) {
                @if (cat.produtos.length > 0) {
                  <div class="cat-label">{{ cat.nome }}</div>
                  @for (produto of cat.produtos; track produto.id) {
                    <button class="produto-card" (click)="selecionarProduto(produto)">
                      <div class="produto-card__info">
                        <span class="produto-card__nome">{{ produto.nome }}</span>
                        @if (produto.descricao) {
                          <span class="produto-card__desc">{{ produto.descricao }}</span>
                        }
                      </div>
                      <span class="produto-card__preco">{{ produto.preco | currencyBr }}</span>
                    </button>
                  }
                }
              }
            }
          </div>
        }

        @if (uiStep() === 'form') {
          <div class="sheet__header">
            <button class="btn-back" (click)="voltarParaPicker()" aria-label="Voltar">
              <lucide-icon name="arrow-left" [size]="18" />
            </button>
            <h2 class="sheet__title">{{ produtoSelecionado()?.nome }}</h2>
            <button class="sheet__close" (click)="fecharPicker()" aria-label="Fechar">
              <lucide-icon name="x" [size]="20" />
            </button>
          </div>

          <div class="form-body">
            <div class="preco-produto">{{ produtoSelecionado()?.preco | currencyBr }}</div>

            <!-- Quantidade -->
            <div class="qty-control">
              <button
                class="qty-btn"
                (click)="decrementarQtd()"
                [disabled]="quantidade() <= 1"
                aria-label="Diminuir quantidade"
              >
                <lucide-icon name="minus" [size]="18" />
              </button>
              <span class="qty-value">{{ quantidade() }}</span>
              <button class="qty-btn" (click)="incrementarQtd()" aria-label="Aumentar quantidade">
                <lucide-icon name="plus" [size]="18" />
              </button>
            </div>

            <!-- Observação -->
            <div class="obs-field">
              <label class="b-label" for="obs">Observação (opcional)</label>
              <textarea
                id="obs"
                class="b-input obs-input"
                placeholder="Ex: sem cebola, bem passado..."
                [value]="observacao()"
                (input)="setObservacao($event)"
                rows="3"
                maxlength="200"
              ></textarea>
            </div>

            <!-- Subtotal -->
            <div class="subtotal">
              <span class="subtotal__label">Subtotal</span>
              <span class="subtotal__valor">
                {{ (produtoSelecionado()?.preco ?? 0) * quantidade() | currencyBr }}
              </span>
            </div>

            <!-- Confirmar -->
            <button
              class="b-btn-primary confirm-btn"
              [disabled]="adicionando()"
              (click)="confirmarAdicao()"
            >
              @if (adicionando()) {
                <lucide-icon name="loader-2" [size]="18" class="spin" />
                Adicionando...
              } @else {
                <lucide-icon name="check" [size]="18" />
                Confirmar pedido
              }
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    /* ===== LAYOUT ===== */
    .layout {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      background-color: var(--b-bg);
      font-family: var(--b-font-sans);
      padding-bottom: 88px;
    }

    /* ===== HEADER ===== */
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

    .btn-back {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-neutral-200);
      background-color: transparent;
      color: var(--b-fg);
      flex-shrink: 0;

      &:hover { background-color: var(--b-bg-sunken); }
    }

    .header__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .header__title {
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
      font-family: monospace;
      line-height: var(--b-line-height-tight);
    }

    .header__sub {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
    }

    .header__total {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
      flex-shrink: 0;
    }

    /* ===== CONTENT ===== */
    .content {
      flex: 1;
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-3);
    }

    /* ===== ITEM CARD ===== */
    .item-card {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);

      &--cancelado {
        opacity: 0.55;
        background-color: var(--b-bg-sunken);
      }

      &--skeleton {
        gap: var(--b-space-3);
      }
    }

    .item-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--b-space-2);
    }

    .item-card__nome {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
      flex: 1;
    }

    .item-card__obs {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
      font-style: italic;
      margin: 0;
    }

    .item-card__actions {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      flex-shrink: 0;
    }

    .item-action {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
      border-radius: var(--b-radius-sm);
      border: 1px solid transparent;
      background-color: transparent;

      &--edit {
        color: var(--b-fg-muted);
        border-color: var(--b-neutral-200);

        &:hover {
          background-color: var(--b-bg-sunken);
          color: var(--b-fg);
        }
      }

      &--cancel {
        color: var(--b-danger-500);
        border-color: var(--b-danger-100);

        &:hover {
          background-color: var(--b-danger-50);
          border-color: var(--b-danger-300);
        }
      }
    }

    .item-card__bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .item-card__qtd {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-muted);
    }

    .item-card__total {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);

      &--riscado {
        text-decoration: line-through;
        color: var(--b-fg-subtle);
      }
    }

    .cancelados-label {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-subtle);
      padding: var(--b-space-1) 0;
      margin-top: var(--b-space-2);
    }

    /* ===== FAB ===== */
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
    }

    /* ===== EMPTY STATE ===== */
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
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
      margin: 0;
    }

    .empty-state__sub {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      margin: 0;
    }

    /* ===== BOTTOM SHEET ===== */
    .sheet-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(44, 26, 14, 0.45);
      backdrop-filter: blur(2px);
      z-index: 100;
    }

    .sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-lg) var(--b-radius-lg) 0 0;
      box-shadow: var(--b-shadow-4);
      z-index: 101;
      max-height: 85dvh;
      display: flex;
      flex-direction: column;
    }

    .sheet__header {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-4) var(--b-space-4) var(--b-space-3);
      border-bottom: 1px solid var(--b-neutral-100);
      flex-shrink: 0;
    }

    .sheet__title {
      flex: 1;
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sheet__close {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border-radius: var(--b-radius-sm);
      border: none;
      background-color: transparent;
      color: var(--b-fg-muted);
      flex-shrink: 0;

      &:hover { background-color: var(--b-bg-sunken); }
    }

    /* Busca */
    .sheet__search {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-3) var(--b-space-4);
      border-bottom: 1px solid var(--b-neutral-100);
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: var(--b-font-size-sm);
      padding: var(--b-space-1) 0;
      outline: none;
      color: var(--b-fg);

      &::placeholder { color: var(--b-fg-subtle); }
    }

    /* Categorias tabs */
    .cat-tabs {
      display: flex;
      gap: var(--b-space-2);
      padding: var(--b-space-3) var(--b-space-4);
      overflow-x: auto;
      flex-shrink: 0;
      scrollbar-width: none;

      &::-webkit-scrollbar { display: none; }
    }

    .cat-tab {
      flex-shrink: 0;
      padding: var(--b-space-1) var(--b-space-3);
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-neutral-200);
      background-color: transparent;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      min-height: 36px;
      font-family: var(--b-font-sans);
      white-space: nowrap;

      &--active {
        background-color: var(--b-primary-500);
        border-color: var(--b-primary-500);
        color: var(--b-fg-inverted);
        font-weight: var(--b-font-weight-semibold);
      }
    }

    /* Produtos */
    .sheet__produtos {
      flex: 1;
      overflow-y: auto;
      padding: 0 var(--b-space-4) var(--b-space-6);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
    }

    .cat-label {
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg-subtle);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-top: var(--b-space-3);
      padding-bottom: var(--b-space-1);
    }

    .produto-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--b-space-3);
      padding: var(--b-space-3) var(--b-space-4);
      background-color: var(--b-bg);
      border-radius: var(--b-radius-md);
      border: 1px solid var(--b-neutral-100);
      cursor: pointer;
      text-align: left;
      font-family: var(--b-font-sans);
      min-height: 56px;
      transition: background-color 0.1s ease;

      &:hover { background-color: var(--b-primary-50); }
      &:active { background-color: var(--b-primary-100); }

      &--skeleton {
        cursor: default;
        gap: var(--b-space-3);
        flex-direction: column;
        align-items: flex-start;
        min-height: 64px;

        &:hover { background-color: var(--b-bg); }
      }
    }

    .produto-card__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .produto-card__nome {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
    }

    .produto-card__desc {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
    }

    .produto-card__preco {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-primary-600);
      flex-shrink: 0;
    }

    /* ===== FORM de quantidade ===== */
    .form-body {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-5);
      padding: var(--b-space-5) var(--b-space-4) var(--b-space-6);
      overflow-y: auto;
    }

    .preco-produto {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
      text-align: center;
    }

    .qty-control {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-6);
    }

    .qty-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      min-height: 48px;
      border-radius: 50%;
      border: 2px solid var(--b-primary-500);
      background-color: transparent;
      color: var(--b-primary-500);
      transition: background-color 0.1s ease;

      &:hover:not(:disabled) { background-color: var(--b-primary-50); }
      &:disabled {
        border-color: var(--b-neutral-300);
        color: var(--b-neutral-300);
        cursor: not-allowed;
      }
    }

    .qty-value {
      font-size: var(--b-font-size-3xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      min-width: 48px;
      text-align: center;
    }

    .obs-field {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
    }

    .obs-input {
      resize: none;
      font-size: var(--b-font-size-sm);
    }

    .subtotal {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-3) var(--b-space-4);
      background-color: var(--b-bg-sunken);
      border-radius: var(--b-radius-md);
    }

    .subtotal__label {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
    }

    .subtotal__valor {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
    }

    .confirm-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      width: 100%;
      min-height: 52px;
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);

      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    /* Spinner */
    .spin { animation: spin 1s linear infinite; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ComandaDetalheComponent implements OnInit, OnDestroy {
  private readonly garcomService = inject(GarcomService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  private readonly comandaId = this.route.snapshot.params['id'] as string;
  private subs: Subscription[] = [];

  protected readonly skeletonItems = Array.from({ length: 3 }, (_, i) => i);

  // UI state — add flow
  protected readonly uiStep = signal<UiStep>('lista');
  protected readonly produtoSelecionado = signal<Produto | null>(null);
  protected readonly quantidade = signal(1);
  protected readonly observacao = signal('');
  protected readonly busca = signal('');
  protected readonly categoriaSelecionada = signal<Categoria | null>(null);
  protected readonly adicionando = signal(false);

  // UI state — edit/cancel flow
  protected readonly itemEmEdicao = signal<ItemComanda | null>(null);
  protected readonly itemParaCancelar = signal<ItemComanda | null>(null);
  protected readonly salvando = signal(false);
  protected readonly cancelando = signal(false);

  // Data
  protected readonly comanda = resource({
    loader: () => this.garcomService.buscarComanda(this.comandaId),
  });

  protected readonly cardapio = resource({
    loader: () =>
      Promise.all([
        this.garcomService.listarCategorias(),
        this.garcomService.listarProdutosDisponiveis(),
      ]).then(([categorias, produtos]) => ({ categorias, produtos })),
  });

  // Computed
  protected readonly itensAtivos = computed(
    () => (this.comanda.value()?.itens ?? []).filter(i => i.status !== 'cancelado')
  );

  protected readonly itensCancelados = computed(
    () => (this.comanda.value()?.itens ?? []).filter(i => i.status === 'cancelado')
  );

  protected readonly totalAtivo = computed(
    () => this.itensAtivos().reduce((sum, i) => sum + i.total, 0)
  );

  protected readonly produtosFiltrados = computed(() => {
    const { categorias, produtos } = this.cardapio.value() ?? { categorias: [], produtos: [] };
    const cat = this.categoriaSelecionada();
    const q = this.busca().toLowerCase().trim();
    return produtos.filter(p =>
      (!cat || p.categoriaId === cat.id) &&
      (!q || p.nome.toLowerCase().includes(q) || (p.descricao ?? '').toLowerCase().includes(q))
    ).map(p => ({ ...p, categoria: categorias.find(c => c.id === p.categoriaId) }));
  });

  protected readonly categoriasFiltradas = computed<CategoriaComProdutos[]>(() => {
    const { categorias } = this.cardapio.value() ?? { categorias: [] };
    const filtrados = this.produtosFiltrados();
    return categorias.map(cat => ({
      ...cat,
      produtos: filtrados.filter(p => p.categoriaId === cat.id),
    }));
  });

  ngOnInit(): void {
    this.subs.push(
      this.socketService.on<ItemComanda>('item:novo').subscribe(item => {
        if (this.comanda.value()?.id === item.id) return;
        this.comanda.reload();
      }),
      this.socketService.on<unknown>('item:atualizado').subscribe(() => {
        this.comanda.reload();
      }),
      this.socketService.on<unknown>('item:cancelado').subscribe(() => {
        this.comanda.reload();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  protected voltar(): void {
    const mesaId = this.comanda.value()?.mesaId;
    if (mesaId) {
      this.router.navigate(['/garcom/mesa', mesaId, 'comandas']);
    } else {
      this.router.navigate(['/garcom/mesas']);
    }
  }

  // ===== Picker =====

  protected abrirPicker(): void {
    this.busca.set('');
    this.categoriaSelecionada.set(null);
    this.uiStep.set('picker');
    if (!this.cardapio.value()) this.cardapio.reload();
  }

  protected fecharPicker(): void {
    this.uiStep.set('lista');
    this.produtoSelecionado.set(null);
    this.quantidade.set(1);
    this.observacao.set('');
  }

  protected voltarParaPicker(): void {
    this.uiStep.set('picker');
  }

  protected selecionarProduto(produto: Produto): void {
    this.produtoSelecionado.set(produto);
    this.quantidade.set(1);
    this.observacao.set('');
    this.uiStep.set('form');
  }

  protected incrementarQtd(): void {
    this.quantidade.update(v => v + 1);
  }

  protected decrementarQtd(): void {
    this.quantidade.update(v => Math.max(1, v - 1));
  }

  protected setBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }

  protected setObservacao(event: Event): void {
    this.observacao.set((event.target as HTMLTextAreaElement).value);
  }

  // ===== Helpers de permissão =====

  protected podeEditar(status: StatusItem): boolean {
    return EDITAVEL.includes(status);
  }

  protected podeCancelar(status: StatusItem): boolean {
    return CANCELAVEL.includes(status);
  }

  // ===== Edição =====

  protected abrirEdicao(item: ItemComanda): void {
    this.itemEmEdicao.set(item);
    this.quantidade.set(item.quantidade);
    this.observacao.set(item.observacao ?? '');
    this.uiStep.set('edicao');
  }

  protected fecharEdicao(): void {
    this.uiStep.set('lista');
    this.itemEmEdicao.set(null);
    this.quantidade.set(1);
    this.observacao.set('');
  }

  protected async confirmarEdicao(): Promise<void> {
    const item = this.itemEmEdicao();
    if (!item || this.salvando()) return;

    this.salvando.set(true);
    try {
      await this.garcomService.editarItem(this.comandaId, item.id, {
        quantidade: this.quantidade(),
        observacao: this.observacao() || undefined,
      });
      this.toast.success('Item atualizado!');
      this.fecharEdicao();
      this.comanda.reload();
    } catch {
      this.toast.danger('Não foi possível editar o item. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  // ===== Cancelamento =====

  protected pedirCancelamento(item: ItemComanda): void {
    this.itemParaCancelar.set(item);
  }

  protected recusarCancelamento(): void {
    this.itemParaCancelar.set(null);
  }

  protected async confirmarCancelamento(): Promise<void> {
    const item = this.itemParaCancelar();
    if (!item || this.cancelando()) return;

    this.cancelando.set(true);
    this.itemParaCancelar.set(null);
    try {
      await this.garcomService.cancelarItem(this.comandaId, item.id);
      this.toast.success(`${item.produto?.nome ?? 'Item'} cancelado.`);
      this.comanda.reload();
    } catch {
      this.toast.danger('Não foi possível cancelar o item. Tente novamente.');
    } finally {
      this.cancelando.set(false);
    }
  }

  protected async confirmarAdicao(): Promise<void> {
    const produto = this.produtoSelecionado();
    if (!produto || this.adicionando()) return;

    this.adicionando.set(true);
    try {
      await this.garcomService.adicionarItem(this.comandaId, {
        produtoId: produto.id,
        quantidade: this.quantidade(),
        observacao: this.observacao() || undefined,
      });
      this.toast.success(`${produto.nome} adicionado!`);
      this.fecharPicker();
      this.comanda.reload();
    } catch {
      this.toast.danger('Não foi possível adicionar o item. Tente novamente.');
    } finally {
      this.adicionando.set(false);
    }
  }

}
